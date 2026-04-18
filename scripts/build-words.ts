import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

interface Word {
  id: number;
  word: string;
  meaningEn: string;
  meaningTr: string;
  exampleEn?: string;
  exampleTr?: string;
  sublist?: number;
}

const ROOT = join(__dirname, "..");
const AWL_PATH = join(ROOT, "AWL.txt");
const AWL_TR_PATH = join(ROOT, "AWL_TR.txt");
const SENT_PATH = join(ROOT, "Cumle_icinde_kullanimlari.txt");
const OUT_PATH = join(ROOT, "public", "data", "words.json");

const SUFFIXES = [
  "ability", "ibility", "ization", "isation",
  "ssion", "ation", "ment", "ness", "ance", "ence", "ible", "able", "ical",
  "ious", "eous", "tive", "sive", "ized", "ised", "ysis",
  "ent", "ant", "ary", "ory", "ous", "ies", "ied", "ive", "ial", "ure",
  "sion", "tion", "yse", "ise", "ize", "ing", "ity", "ion", "ate",
  "ic", "al", "ed", "es", "ly", "er", "or", "ve", "de", "ty",
  "s", "e", "y", "d", "t",
];

function readUtf8(path: string): string {
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text.replace(/\r\n/g, "\n");
}

function stripOnce(lower: string): string[] {
  const out: string[] = [];
  for (const s of SUFFIXES) {
    const minRemaining = s.length <= 2 ? 4 : 3;
    if (lower.length - s.length >= minRemaining && lower.endsWith(s)) {
      out.push(lower.slice(0, -s.length));
    }
  }
  return out;
}

function stems(w: string): string[] {
  const lower = w.toLowerCase();
  const out = new Set<string>([lower]);
  for (const s of stripOnce(lower)) out.add(s);
  for (const base of Array.from(out)) {
    if (base === lower) continue;
    for (const s of stripOnce(base)) out.add(s);
  }
  return Array.from(out);
}

interface SentenceEntry {
  sublist: number;
  exampleEn: string;
  exampleTr: string;
}

function parseAwl(text: string): { word: string; meaningEn: string }[] {
  const out: { word: string; meaningEn: string }[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^Academic Word List/i.test(line)) continue;
    // Prefer 2+ space split (column format). Fallback to first whitespace
    // for the few entries where the column gap collapsed to a single space.
    const bigSplit = line.split(/\s{2,}/);
    let word: string;
    let meaningEn: string;
    if (bigSplit.length >= 2) {
      word = bigSplit[0].trim().toLowerCase();
      meaningEn = bigSplit.slice(1).join(" ").trim();
    } else {
      const m = /^(\S+)\s+(.+)$/.exec(line);
      if (!m) continue;
      word = m[1].trim().toLowerCase();
      meaningEn = m[2].trim();
    }
    if (!word || !meaningEn) continue;
    out.push({ word, meaningEn });
  }
  return out;
}

function parseAwlTr(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^Academic Word List/i.test(line)) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const word = line.slice(0, idx).trim().toLowerCase();
    const meaning = line.slice(idx + 1).trim();
    if (!word || !meaning) continue;
    map.set(word, meaning);
  }
  return map;
}

function parseSentences(text: string): Map<string, SentenceEntry> {
  const map = new Map<string, SentenceEntry>();
  const lines = text.split("\n").map((l) => l.trim());
  let currentSublist = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    const subMatch = /^Sublist\s+(\d+)/i.exec(line);
    if (subMatch) {
      currentSublist = parseInt(subMatch[1], 10);
      i++;
      continue;
    }
    const wordMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (wordMatch) {
      const word = wordMatch[1].trim().toLowerCase();
      // find next non-empty line for exampleEn, then for exampleTr
      let j = i + 1;
      while (j < lines.length && !lines[j]) j++;
      const exampleEn = j < lines.length ? lines[j] : "";
      let k = j + 1;
      while (k < lines.length && !lines[k]) k++;
      let exampleTrRaw = k < lines.length ? lines[k] : "";
      // strip 🇹🇷 prefix if present
      exampleTrRaw = exampleTrRaw.replace(/^🇹🇷\s*/u, "").trim();
      if (word && exampleEn && !map.has(word)) {
        map.set(word, {
          sublist: currentSublist,
          exampleEn,
          exampleTr: exampleTrRaw,
        });
      }
      i = k + 1;
      continue;
    }
    i++;
  }
  return map;
}

function buildStemIndex(
  sentenceMap: Map<string, SentenceEntry>,
): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const key of sentenceMap.keys()) {
    for (const s of stems(key)) {
      if (!idx.has(s)) idx.set(s, new Set());
      idx.get(s)!.add(key);
    }
  }
  return idx;
}

function main(): void {
  const awlText = readUtf8(AWL_PATH);
  const trText = readUtf8(AWL_TR_PATH);
  const sentText = readUtf8(SENT_PATH);

  const awlEntries = parseAwl(awlText);
  if (awlEntries.length !== 570) {
    throw new Error(
      `[build-words] Expected 570 AWL entries, got ${awlEntries.length}`,
    );
  }

  const trMap = parseAwlTr(trText);
  const sentMap = parseSentences(sentText);
  const stemIdx = buildStemIndex(sentMap);

  const missingTr: string[] = [];
  const missingExamples: string[] = [];
  const ambiguous: string[] = [];
  const words: Word[] = awlEntries.map((e, i): Word => {
    const id = i + 1;
    const meaningTr = trMap.get(e.word) ?? "";
    if (!meaningTr) missingTr.push(e.word);

    let sentenceKey: string | undefined;
    if (sentMap.has(e.word)) {
      sentenceKey = e.word;
    } else {
      const seen = new Set<string>();
      for (const s of stems(e.word)) {
        const bucket = stemIdx.get(s);
        if (!bucket) continue;
        for (const k of bucket) seen.add(k);
      }
      const candidates = Array.from(seen);
      if (candidates.length >= 1) {
        sentenceKey = candidates[0];
        if (candidates.length > 1) {
          ambiguous.push(`${e.word} → ${candidates.join("/")}`);
        }
      }
    }

    const word: Word = {
      id,
      word: e.word,
      meaningEn: e.meaningEn,
      meaningTr,
    };
    if (sentenceKey) {
      const entry = sentMap.get(sentenceKey)!;
      word.exampleEn = entry.exampleEn;
      word.exampleTr = entry.exampleTr;
      word.sublist = entry.sublist;
    } else {
      missingExamples.push(e.word);
    }
    return word;
  });

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(words, null, 2), "utf8");

  const exampleCount = words.filter((w) => w.exampleEn).length;
  const trCount = 570 - missingTr.length;

  console.log(`[build-words] ✓ ${awlEntries.length} words loaded from AWL.txt`);
  if (missingTr.length === 0) {
    console.log(`[build-words] ✓ 570/570 Turkish meanings matched`);
  } else {
    console.log(`[build-words] ⚠ ${trCount}/570 Turkish meanings matched`);
    console.log(
      `[build-words] Missing TR: ${JSON.stringify(missingTr)}`,
    );
  }
  if (missingExamples.length === 0) {
    console.log(`[build-words] ✓ 570/570 example sentences matched`);
  } else {
    console.log(
      `[build-words] ⚠ ${exampleCount}/570 example sentences matched`,
    );
    console.log(
      `[build-words] Missing examples: ${JSON.stringify(missingExamples)}`,
    );
  }
  if (ambiguous.length > 0) {
    console.log(
      `[build-words] Ambiguous matches (took first): ${JSON.stringify(ambiguous)}`,
    );
  }
  console.log(`[build-words] → wrote ${OUT_PATH}`);
}

main();
