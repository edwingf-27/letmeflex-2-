/**
 * Amélioration automatique des prompts avant envoi à FAL.ai
 *
 * Objectif : résultats INDISTINGUABLES d'une vraie photo.
 * On force le modèle à travailler en mode RAW photography, pas en mode "AI art".
 */

// ─── Préfixe RAW photo — trompe le modèle pour qu'il pense "appareil photo" ──

const PHOTO_PREFIX =
  "RAW photo, DSLR photograph, Canon EOS R5, 50mm f/1.4 lens, ISO 100, " +
  "natural bokeh, photorealistic, hyperrealistic, ultra-detailed, ";

// ─── Suffixe technique — renforce la texture peau + qualité ──────────────────

const PHOTO_SUFFIX =
  ". Natural skin texture, visible pores, realistic hair strands, " +
  "authentic shadows and highlights, true-to-life colors, " +
  "8K UHD resolution, HDR, sharp focus, professional color grading. " +
  "NOT a painting, NOT an illustration, NOT CGI. Real photograph.";

// ─── Instructions face pour PuLID ────────────────────────────────────────────

const FACE_INSTRUCTIONS =
  "the subject's face is natural and realistic with authentic skin texture, " +
  "real pores and skin details, consistent lighting matching the scene, " +
  "seamless face integration, no plastic look, ";

// ─── Negative prompt ultra-strict anti-cartoon ───────────────────────────────

export const ENHANCED_NEGATIVE_PROMPT =
  "painting, drawing, sketch, illustration, cartoon, anime, manga, " +
  "3D render, CGI, digital art, concept art, artwork, artificial, " +
  "fake skin, plastic skin, smooth skin, airbrushed, overprocessed, " +
  "oversaturated, unreal engine, octane render, vray, " +
  "watermark, text, logo, signature, username, " +
  "blurry, out of focus, low quality, worst quality, bad anatomy, " +
  "deformed face, extra limbs, disfigured, mutation, " +
  "jpeg artifacts, noise, grain, pixelated";

// ─── Fonction principale ─────────────────────────────────────────────────────

export interface EnhanceOptions {
  hasFace: boolean;
  isSceneBased: boolean;
}

export function enhancePrompt(rawPrompt: string, options: EnhanceOptions): string {
  const base = rawPrompt.trim();
  if (!base) return base;

  const { hasFace } = options;
  const faceBlock = hasFace ? FACE_INSTRUCTIONS : "";

  // On applique TOUJOURS le préfixe/suffixe RAW photo
  // (scène prédéfinie ou prompt libre — ça renforce toujours le réalisme)
  return `${PHOTO_PREFIX}${faceBlock}${base}${PHOTO_SUFFIX}`;
}

// ─── Helpers loggables ───────────────────────────────────────────────────────

export function logPromptEnhancement(
  original: string,
  enhanced: string,
  options: EnhanceOptions
): void {
  console.log("[PROMPT_ENHANCER]", {
    isSceneBased: options.isSceneBased,
    hasFace: options.hasFace,
    originalLength: original.length,
    enhancedLength: enhanced.length,
    preview: enhanced.substring(0, 150) + (enhanced.length > 150 ? "…" : ""),
  });
}
