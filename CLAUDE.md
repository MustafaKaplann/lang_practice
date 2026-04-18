# CLAUDE.md - AWL Master (YDS/YÖKDİL Hazırlık)

## Proje Özeti

**AWL Master**, YDS ve YÖKDİL sınavlarına hazırlanan kullanıcılar için 570 Academic Word List (AWL) kelimesini oyunlaştırılmış şekilde öğreten bir web uygulamasıdır. Kullanıcı; her kelimenin İngilizce ve Türkçe anlamını, örnek cümle içinde kullanımını ve akademik bağlamdaki nüanslarını interaktif mini oyunlar aracılığıyla pekiştirir.

**Hedef:** Hızlı geliştirilmiş, basit, odaklanmış, polished bir kelime çalışma platformu. Aşırı mühendislikten kaçın.

## Teknoloji Yığını

- **Framework:** Next.js 15+ (App Router) + TypeScript
- **Styling:** TailwindCSS
- **Veritabanı:** YOK. Tüm kelime verisi `/data/words.json` içinde statik JSON.
- **Kullanıcı ilerlemesi:** `localStorage` (hesap/auth yok)
- **Animasyon:** Framer Motion (hafif kullanım, abartma)
- **Icon:** lucide-react
- **Deployment:** Vercel

**Kullanma:** Supabase, Prisma, PostgreSQL, NextAuth, Redis veya herhangi bir backend servisi. Proje tamamen client-side çalışacak.

## Veri Yapısı

Tüm kelimeler tek bir JSON dosyasında toplanacak. Kullanıcının yüklediği 3 dosyadan (`AWL.txt`, `AWL_TR.txt`, `Cumle_icinde_kullanimlari.txt`) veri çekilip birleştirilecek.

```typescript
// /data/words.json şeması
interface Word {
  id: number;              // 1-570
  word: string;            // "abandon"
  meaningEn: string;       // "to leave forever, or to stop something in progress"
  meaningTr: string;       // "sonsuza kadar terk etmek ya da devam eden bir şeyi bırakmak"
  exampleEn?: string;      // "Scientists analyse data carefully..."
  exampleTr?: string;      // "Bilim insanları..."
  sublist?: number;        // 1-10 (Sublist numarası, Cumle_icinde'den geliyor)
}
```

**Önemli:** Cümle dosyasındaki örnekler tüm 570 kelimeyi kapsamayabilir veya farklı formda olabilir (örn. "ANALYSE" oysa listede "analysis" var). Veri parse edilirken eşleştirme fuzzy yapılmalı (lowercase + root matching). Eşleştirme olmayan kelimeler için `exampleEn` / `exampleTr` opsiyonel kalır.

## Veri Hazırlama Script'i

`/scripts/build-words.ts` — 3 txt dosyasını okur, birleştirir, `words.json` üretir. Her build öncesi bir kez çalıştırılır. Output'u repo'ya commitle.

## Oyun Modları (MVP)

Ana menüde 4 oyun modu + bir "Kelime Sözlüğü" sayfası:

### 1. Flashcard Modu
- Kelime gösterilir, kullanıcı tahmin eder, "Göster" tuşu ile Türkçe anlam + örnek cümle açılır.
- "Biliyorum" / "Bilmiyorum" butonları → localStorage'a kaydedilir.
- Kartlar flip animasyonu ile döner.

### 2. Çoktan Seçmeli Quiz (Multiple Choice)
- 2 varyant: "Kelimenin Türkçesi ne?" ve "Türkçesi verilen kelimenin İngilizcesi ne?"
- 4 şık (1 doğru + 3 rastgele distraktör; distraktörler aynı sublist'ten tercih edilmeli).
- Anında feedback: yeşil/kırmızı + doğru cevap gösterimi.
- Her 10 sorudan sonra skor ekranı.

### 3. Cümle Boşluk Doldurma (Fill in the Blank)
- Örnek İngilizce cümle gösterilir, hedef kelime `_____` olarak çıkarılır.
- Kullanıcı ya yazar ya da 4 şıktan seçer (başlangıçta şık modu daha kolay).
- Türkçe çeviri ipucu olarak "İpucu" butonu altında gizlenir.

### 4. Hızlı Eşleştirme (Matching)
- 6 İngilizce + 6 Türkçe kelime iki sütunda karıştırılır.
- Tıkla-eşleştir mekaniği, süre tutulur, hatalar sayılır.

### 5. Kelime Sözlüğü (Oyun değil, referans)
- Tüm 570 kelime listelenir, sublist'e göre filtrelenir.
- Arama çubuğu (word + meaningTr'de fuzzy search).
- Bir kelimeye tıklayınca detay paneli açılır: İngilizce anlam, Türkçe anlam, örnek cümle.

## Kullanıcı İlerleme Takibi

`localStorage` key: `awl-progress`. Şema:

```typescript
interface Progress {
  knownWords: number[];        // "Biliyorum" denen word id'leri
  strugglingWords: number[];   // Son 5 denemede 2+ kez yanlış yapılan word id'leri
  wordStats: Record<number, { correct: number; wrong: number; lastSeen: string }>;
  streak: { current: number; lastDate: string };  // Günlük çalışma serisi
  totalXP: number;             // Her doğru cevap +10 XP
}
```

## Gamification Unsurları

Bunlar MVP'de olmalı, karmaşıklaştırma:

- **XP sistemi:** Her doğru cevap +10, streak bonus +5.
- **Günlük seri (streak):** Ardışık gün sayısı, header'da alev ikonu ile.
- **İlerleme çubuğu:** Ana sayfada "X / 570 kelime öğrenildi".
- **Sublist rozetleri:** Bir sublist'teki tüm kelimeleri "biliyorum" olarak işaretleyince rozet.

## Tasarım Yönergeleri

- **Tema:** Modern, minimal, akademik ama sıkıcı değil. Dark mode varsayılan.
- **Renk paleti:** Koyu arka plan (slate-950), accent olarak canlı bir renk (mor veya emerald).
- **Tipografi:** Bir UI font (Inter) + bir heading font (örn. Space Grotesk veya Bricolage Grotesque).
- **Mikro-etkileşimler:** Hover, doğru/yanlış feedback animasyonları, XP kazanınca küçük "pop" efekti.
- **Mobile-first:** Kullanıcı telefondan da çalışabilmeli.
- **Animasyonları hafif tut** — sayfa geçişlerini yavaşlatma.

## Dosya Yapısı

```
/
├── app/
│   ├── page.tsx                 # Ana menü / Dashboard
│   ├── flashcards/page.tsx
│   ├── quiz/page.tsx
│   ├── fill-blank/page.tsx
│   ├── matching/page.tsx
│   ├── dictionary/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                      # Genel UI (Button, Card, ProgressBar)
│   ├── games/                   # Oyun component'leri
│   └── layout/                  # Header, Sidebar
├── data/
│   └── words.json               # 570 kelime
├── lib/
│   ├── progress.ts              # localStorage yardımcıları
│   ├── shuffle.ts               # Soru üretme, random seçme
│   └── types.ts
├── scripts/
│   └── build-words.ts           # TXT → JSON converter (bir kez çalıştırılır)
└── public/
```

## Geliştirme Prensipleri

1. **Hız > mükemmellik.** Çalışan MVP bir haftadan az sürmeli. Over-engineering yapma.
2. **Client-side everything.** API route, server action kullanma. Static + localStorage yeterli.
3. **Component'leri küçük tut.** Bir dosya 200 satırı geçiyorsa böl.
4. **TypeScript strict mode açık.** `any` kullanma.
5. **i18n yok.** Arayüz Türkçe, kelime verisi iki dilli.
6. **Test yazma.** MVP'de gereksiz. Manuel test yeterli.

## İleride Eklenebilecekler (ŞİMDİ YAPMA)

Bu özellikler MVP'den SONRA düşünülecek. Şu an bunlara kod yazma, placeholder koyma:

- Spaced repetition (SM-2 algoritması)
- Telaffuz sesi (Web Speech API)
- Kelime türetimleri (word forms: abandon → abandoned, abandonment)
- Yazma pratiği (dikte modu)
- İstatistik sayfası (grafiklerle)
- PWA / offline mod
- Bulut senkronizasyon (bu noktada Supabase gelebilir)

## Önemli Notlar

- Supabase'i **proaktif önerme**. Kullanıcı istemedikçe backend ekleme.
- Kelime verisini her build'de parse etme, `words.json` statik kalsın.
- İlk commit MVP'nin çalışan hali olsun; sonraki iterasyonlarda özellik ekleyeceğiz.