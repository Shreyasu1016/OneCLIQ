# Asset prompts

The repository already includes the hero landscape, footer artwork, app icon, social poster, and Open Graph image.
These prompts document the creative direction in case you want to remake them. The landscapes also have an SVG
fallback in `src/components/ui/landscape.tsx` if the image paths in `src/lib/art.ts` are set to `null`.

Design system: **Paper & Night** (see `DESIGN.md`). Paper `#F4F1EA`, ink `#151412`, ember `#E5582B`,
dusk `#5B4BDB`, sky `#BFD4EE`. Type: Instrument Serif (display), Doto (dot-matrix), Geist (UI), Geist Mono.

---

## 1. Hero landscape: `public/art/hero-landscape.webp`

2400×900, landscape. Sits at the bottom of the hero, under the search box. The top 30% fades into the page, so keep
it sky.

> A wide, hand-painted anime-style landscape in the spirit of Studio Ghibli background art, 2400×900. Bright
> morning. The top third is soft pale-blue sky (#BFD4EE) with big fluffy, painterly white cumulus clouds, fading
> to near-white at the very top. In the middle distance, hazy blue mountains. Tall dark-green pine trees cluster on
> the left and right edges, framing an open meadow in the center so the middle stays calm. A gentle grassy hill in
> the foreground with tiny white wildflowers. A small flock of distant birds in the center sky. Gouache and
> watercolor texture, visible brush strokes, soft light, no people, no buildings, no text, no logos.

## 2. Footer meadow: `public/art/footer-meadow.webp`

2400×800, landscape. The giant black “onecliq” wordmark sits on top of it, so it should be busy but mid-toned.

> A wide, hand-painted storybook landscape, 2400×800, in the style of a dreamy gouache illustration. Dusk light with
> a soft peach-to-lilac sky (#F0D9C8 to #E9D6EE) and a subtle violet glow (#5B4BDB at low opacity) in the top-right
> corner. Rolling bright-green hills, round leafy trees and a few dark pines, fields of purple lavender and lilac
> wildflowers in the foreground, tall grass blades on the right edge. Rich but slightly desaturated colors, visible
> brush texture, soft film grain. No people, no buildings, no text, no logos. The top 15% should be calm, light sky.

To replace either artwork file, export it as WebP (about 80% quality) and put it at the path already used in `src/lib/art.ts`:

```ts
export const ART = {
  hero: "/art/hero-landscape.webp",
  footer: "/art/footer-meadow.webp",
};
```

---

## 3. App icon (optional, 1024×1024 PNG, transparent background)

> A minimal app icon: a rounded square (squircle, about 22% corner radius) filled with flat near-black #151412. In
> the center, a warm off-white (#F4F1EA) outlined circle with a downward arrow inside it. A small solid ember-orange
> (#E5582B) dot sits at the lower-right corner of the circle. Flat vector, crisp geometry, no text, no gradient, no
> shadow, no 3D. Centered with generous padding.

## 4. Open Graph card (optional, 1200×630 PNG)

> A calm editorial banner, 1200×630, warm off-white paper background (#F4F1EA) with a faint dot grid. A soft
> pale-blue (#BFD4EE) dome of light rises from the bottom center. Large black serif headline (like Instrument
> Serif): “The right download from any GitHub release.” with the word “right” in italic. Below it in small grey sans
> serif: “Paste a link · we match your OS and CPU · download from GitHub”. Top-left: a small black rounded-square
> logo with a white circled down-arrow and an orange dot, next to the word “OneCLIQ”. Bottom-left: rounded pill
> labels “Windows”, “macOS”, “Linux”, “x64”, “arm64” with thin grey borders. Minimal, no photos, no people.

Save a replacement as `src/app/opengraph-image.png`. The repository already uses this image file for link previews.

## 5. Night poster (optional, for social posts; 1080×1350)

> A grainy retro-futurist poster, 1080×1350, after the Perplexity “Search like never before” posters. Deep night
> sky (#0B0B0C) full of tiny white stars. In the center, a glowing terminal window whose light blooms outward in a
> hot ember-orange (#E5582B) core fading into violet (#5B4BDB), with heavy film grain and risograph texture. Over it,
> a white serif headline: “Same resolver, in your terminal.” with “in your” in italic. Bottom edge in small white
> monospace caps: “PASTE A LINK.” left, “ONECLIQ · OQGIT” center, “GET THE FILE.” right. No people, no logos.
