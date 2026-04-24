import { wordVariants } from "./fill-blank";

export interface Segment {
  text: string;
  highlight: boolean;
}

export function highlightAWLWords(text: string, awlWordSet: Set<string>): Segment[] {
  if (awlWordSet.size === 0) return [{ text, highlight: false }];
  const tokens = text.split(/(\b\w+\b)/);
  const segments: Segment[] = [];
  for (const token of tokens) {
    if (token === "") continue;
    const isAWL = awlWordSet.has(token.toLowerCase());
    if (segments.length > 0 && segments[segments.length - 1].highlight === isAWL) {
      segments[segments.length - 1].text += token;
    } else {
      segments.push({ text: token, highlight: isAWL });
    }
  }
  return segments;
}

export function highlightWord(sentence: string, word: string): Segment[] {
  const variants = wordVariants(word);
  const pattern = variants.map(escapeRegex).join("|");
  if (!pattern) return [{ text: sentence, highlight: false }];
  const re = new RegExp(`\\b(${pattern})\\b`, "gi");
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    if (m.index > last) {
      out.push({ text: sentence.slice(last, m.index), highlight: false });
    }
    out.push({ text: m[0], highlight: true });
    last = m.index + m[0].length;
  }
  if (last < sentence.length) {
    out.push({ text: sentence.slice(last), highlight: false });
  }
  return out.length > 0 ? out : [{ text: sentence, highlight: false }];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
