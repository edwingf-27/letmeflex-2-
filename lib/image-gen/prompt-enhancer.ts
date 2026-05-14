/**
 * Amélioration automatique des prompts avant envoi à FAL.ai
 *
 * Stratégie :
 * - Prompt libre (studio) : enrichissement complet avec qualité photo + éclairage
 * - Prompt scène (sceneId) : déjà haute qualité, on ajoute uniquement les
 *   instructions face swap si une photo est fournie
 */

// ─── Blocs de qualité ────────────────────────────────────────────────────────

const QUALITY_PREFIX =
  "Hyper-realistic cinematic photograph, ultra-detailed, professional photography, ";

const QUALITY_SUFFIX =
  ", shot on Sony A7R V 85mm f/1.8 lens, shallow depth of field, " +
  "cinematic color grading, 8K resolution, photorealistic render, " +
  "sharp focus, dramatic natural lighting, award-winning photo. " +
  "No watermarks, no text, no logos.";

/**
 * Instructions ajoutées quand l'utilisateur a uploadé une photo.
 * Optimisées pour PuLID (fal-ai/pulid) qui gère le face swap.
 */
const FACE_INSTRUCTIONS =
  "natural and seamless face integration, realistic skin texture, " +
  "authentic facial features preserved, professional portrait, " +
  "consistent lighting between face and scene, ";

// ─── Negative prompt partagé ─────────────────────────────────────────────────

export const ENHANCED_NEGATIVE_PROMPT =
  "watermark, text, logo, blurry, low quality, cartoon, illustration, " +
  "ugly, distorted, amateur, grain, overexposed, deformed face, " +
  "extra limbs, bad anatomy, unrealistic skin, plastic look, " +
  "duplicate, error, cropped, worst quality, jpeg artifacts";

// ─── Fonction principale ─────────────────────────────────────────────────────

export interface EnhanceOptions {
  /** L'utilisateur a fourni une photo → instructions face swap */
  hasFace: boolean;
  /**
   * Le prompt vient d'une scène prédéfinie (scenes.ts) qui est déjà
   * très détaillée → on n'ajoute pas le préfixe/suffixe qualité
   */
  isSceneBased: boolean;
}

export function enhancePrompt(rawPrompt: string, options: EnhanceOptions): string {
  const base = rawPrompt.trim();
  if (!base) return base;

  const { hasFace, isSceneBased } = options;
  const faceBlock = hasFace ? FACE_INSTRUCTIONS : "";

  // Prompts de scène : déjà riches (CAMERA constant dans scenes.ts)
  // On se contente d'injecter les instructions face si besoin
  if (isSceneBased) {
    if (hasFace) {
      return `${faceBlock}${base}`;
    }
    return base;
  }

  // Prompt libre : enrichissement complet
  return `${QUALITY_PREFIX}${faceBlock}${base}${QUALITY_SUFFIX}`;
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
    preview: enhanced.substring(0, 120) + (enhanced.length > 120 ? "…" : ""),
  });
}
