/**
 * Painted artwork made from the prompts in docs/ASSET_PROMPTS.md.
 * Drop the files into public/art/ and set each path here. While a value is null,
 * <Landscape> draws its SVG fallback instead, so nothing ever renders broken.
 */
export const ART: Record<"hero" | "footer", string | null> = {
  hero: "/art/hero-landscape.webp",
  footer: "/art/footer-meadow.webp",
};
