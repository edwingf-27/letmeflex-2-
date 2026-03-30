import { db } from "@/lib/db";

const DEFAULT_NEGATIVE =
  "watermark, text, logo, blurry, low quality, cartoon, illustration, ugly, distorted, amateur, grain, overexposed";

const CAMERA_QUALITY =
  "Shot on Sony A7R V, shallow depth of field, cinematic color grading, editorial photography quality. No watermarks, no text.";

interface PromptOptions {
  subcategory: string;
  brand?: string;
  model?: string;
  city?: string;
  color?: string;
  shot?: string;
  extra?: string;
}

export function buildPrompt(
  category: string,
  options: PromptOptions
): { prompt: string; negativePrompt: string } {
  const builder = promptBuilders[category];
  if (!builder) {
    return {
      prompt: `Ultra-photorealistic photograph of luxury ${category} scene. ${CAMERA_QUALITY}`,
      negativePrompt: DEFAULT_NEGATIVE,
    };
  }
  return {
    prompt: builder(options),
    negativePrompt: DEFAULT_NEGATIVE,
  };
}

export function buildBackgroundPrompt(
  category: string,
  options: PromptOptions
): { prompt: string; negativePrompt: string } {
  const builder = backgroundPromptBuilders[category];
  if (!builder) {
    return {
      prompt: `Ultra-photorealistic luxury background scene for ${category}. Dramatic lighting, cinematic composition. ${CAMERA_QUALITY}`,
      negativePrompt: DEFAULT_NEGATIVE,
    };
  }
  return {
    prompt: builder(options),
    negativePrompt: DEFAULT_NEGATIVE,
  };
}

const backgroundPromptBuilders: Record<string, (opts: PromptOptions) => string> = {
  watches: () =>
    `Dark luxury marble surface with warm studio lighting, soft bokeh in the background, macro photography setup, premium felt display pad, elegant reflections. ${CAMERA_QUALITY}`,
  cars: (opts) => {
    const shotMap: Record<string, string> = {
      exterior: `Luxury coastal road at golden hour, Mediterranean cliffs, dramatic warm lighting, cinematic winding road, palm trees, pristine tarmac. ${CAMERA_QUALITY}`,
      interior_wheel: `Luxury garage interior with dramatic spot lighting, polished concrete floor, premium automotive setting. ${CAMERA_QUALITY}`,
      interior_passenger: `Night city street through windshield, neon reflections, rain-slicked road, atmospheric urban scene. ${CAMERA_QUALITY}`,
      detail: `Pristine showroom environment, gradient dark background, controlled studio lighting, automotive photography setup. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.shot || "exterior"] || shotMap.exterior;
  },
  yacht: () =>
    `Crystal turquoise Mediterranean waters, dramatic coastal cliffs, perfect blue sky with wispy clouds, golden hour light reflecting on calm sea surface. ${CAMERA_QUALITY}`,
  mansion: () =>
    `Manicured luxury estate grounds, infinity pool reflecting sunset sky, mature palm trees, architectural landscape lighting, twilight ambiance. ${CAMERA_QUALITY}`,
  penthouse: (opts) => {
    const cityMap: Record<string, string> = {
      dubai: `Dubai skyline at twilight with Burj Khalifa, warm ambient glow from city lights, dramatic purple and orange sky. ${CAMERA_QUALITY}`,
      miami: `Miami Beach oceanfront at sunset, turquoise water, art deco buildings glowing in warm light, palm tree silhouettes. ${CAMERA_QUALITY}`,
      nyc: `Manhattan skyline from high altitude at blue hour, city lights twinkling, Central Park visible, dramatic clouds. ${CAMERA_QUALITY}`,
      la: `Los Angeles Hills panorama at golden hour, downtown skyline in distance, lush green hillsides, warm California light. ${CAMERA_QUALITY}`,
    };
    return cityMap[opts.subcategory] || `Dramatic city skyline at blue hour, panoramic urban vista, atmospheric lighting. ${CAMERA_QUALITY}`;
  },
  club: () =>
    `Exclusive nightclub VIP area ambiance, moody purple and blue LED lighting, premium velvet seating, bokeh crowd in background, atmospheric haze. ${CAMERA_QUALITY}`,
  shopping: () =>
    `Pristine white marble surface with soft natural window light, luxury retail environment, minimalist clean background, premium tissue paper and ribbons. ${CAMERA_QUALITY}`,
  activities: (opts) => {
    const shotMap: Record<string, string> = {
      golf: `Pristine luxury golf course fairway, rolling green hills, country club in background, perfect blue sky, morning dew. ${CAMERA_QUALITY}`,
      tennis: `Premium clay tennis court, Mediterranean luxury club facility, warm afternoon sunlight, manicured surroundings. ${CAMERA_QUALITY}`,
      paddle: `Modern glass-walled padel court, luxury sports club, bright daylight, clean contemporary architecture. ${CAMERA_QUALITY}`,
      buggy: `Desert sand dunes at golden hour, dramatic long shadows, warm orange sky, vast open landscape. ${CAMERA_QUALITY}`,
      restaurant: `Michelin-star restaurant interior, candlelit ambiance, premium table setting, starched linen, warm intimate lighting. ${CAMERA_QUALITY}`,
      private_jet: `View through private jet oval window, clouds and blue sky, warm cabin light spilling onto cream leather, altitude atmosphere. ${CAMERA_QUALITY}`,
      helicopter: `Dramatic aerial coastal panorama, turquoise water meeting white sand, late afternoon light, sweeping vista below. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.subcategory] || shotMap.golf;
  },
};

const promptBuilders: Record<string, (opts: PromptOptions) => string> = {
  watches: (opts) => {
    const brandMap: Record<string, string> = {
      rolex: "Rolex",
      ap: "Audemars Piguet",
      patek: "Patek Philippe",
      rm: "Richard Mille",
    };
    const brand = brandMap[opts.subcategory] || opts.subcategory;
    const model = opts.model || "";
    return `Ultra-photorealistic close-up photograph of a ${brand} ${model} luxury watch on a man's wrist. The watch is perfectly detailed — polished case catching warm light, intricate dial with precise markers, premium leather or metal bracelet. Background is a subtle dark luxury setting. Macro photography, 85mm lens, f/2.0. ${CAMERA_QUALITY}`;
  },

  cars: (opts) => {
    const brandMap: Record<string, string> = {
      ferrari: "Ferrari",
      lambo: "Lamborghini",
      rr: "Rolls-Royce",
      bentley: "Bentley",
    };
    const brand = brandMap[opts.subcategory] || opts.subcategory;
    const model = opts.model || "";
    const color = opts.color || "in stunning factory color";
    const shotMap: Record<string, string> = {
      exterior: `Ultra-photorealistic photograph of a ${brand} ${model} ${color}, shot at golden hour on a coastal road. The car is perfectly detailed — glossy paint catching warm sunlight, carbon fiber accents, brake calipers visible through the alloy wheels. Shallow depth of field, 85mm lens, f/1.8. ${CAMERA_QUALITY}`,
      interior_wheel: `Ultra-photorealistic photograph from the driver's perspective inside a ${brand} ${model}. Hands on the premium leather steering wheel, detailed dashboard with carbon fiber trim, digital instrument cluster glowing. Warm ambient lighting, luxury interior. 24mm lens, f/2.8. ${CAMERA_QUALITY}`,
      interior_passenger: `Ultra-photorealistic photograph from the passenger seat of a ${brand} ${model}. Premium quilted leather seats, detailed center console, ambient lighting strips. City view through the windshield. 24mm lens. ${CAMERA_QUALITY}`,
      detail: `Ultra-photorealistic extreme close-up photograph of a ${brand} ${model} detail — the badge emblem, perfect paint finish with micro-reflections, premium materials. Macro photography, 100mm lens, f/2.8, studio-quality lighting. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.shot || "exterior"] || shotMap.exterior;
  },

  yacht: (opts) => {
    const shotMap: Record<string, string> = {
      deck_front: `Ultra-photorealistic photograph from the front deck of a luxury 50-meter superyacht. Teak deck perfectly maintained, chrome railings gleaming, turquoise Mediterranean water. Golden hour light. Wide angle, 16mm lens, f/8. ${CAMERA_QUALITY}`,
      deck_rear: `Ultra-photorealistic photograph of the rear deck of a luxury superyacht with infinity pool, sunbeds, and champagne glasses. Crystal blue ocean backdrop. Warm afternoon light. 24mm lens. ${CAMERA_QUALITY}`,
      aerial: `Ultra-photorealistic aerial drone photograph of a luxury superyacht anchored in crystal turquoise water near a Mediterranean coast. The yacht is perfectly detailed with multiple decks, helipad, pool. Shot from 45-degree angle. ${CAMERA_QUALITY}`,
      interior: `Ultra-photorealistic photograph of a luxury superyacht interior saloon. Marble floors, cream leather sofas, panoramic windows showing ocean views. Warm ambient lighting, fresh flowers on the table. 24mm lens. ${CAMERA_QUALITY}`,
      sunset: `Ultra-photorealistic photograph of a luxury superyacht silhouetted against a dramatic orange and purple sunset at sea. Perfect reflections on calm water, warm golden light. 85mm lens, f/4. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.subcategory] || shotMap.deck_front;
  },

  mansion: (opts) => {
    const shotMap: Record<string, string> = {
      exterior: `Ultra-photorealistic photograph of a $30 million modern mansion exterior. White and glass architecture, manicured gardens, fountain in the circular driveway, luxury car parked. Dusk with warm interior lights glowing. 24mm lens. ${CAMERA_QUALITY}`,
      interior_living: `Ultra-photorealistic photograph of an ultra-luxury mansion living room. Double-height ceilings, floor-to-ceiling windows, designer furniture, statement chandelier, marble floors. Warm afternoon light streaming in. 16mm lens. ${CAMERA_QUALITY}`,
      interior_master: `Ultra-photorealistic photograph of a luxury master bedroom suite. King bed with premium linens, panoramic city views through floor-to-ceiling windows, en-suite visible, warm ambient lighting. 24mm lens. ${CAMERA_QUALITY}`,
      pool_outdoor: `Ultra-photorealistic photograph of a luxury mansion outdoor pool area. Infinity pool with city skyline view, sun loungers, outdoor kitchen, palm trees, blue tile mosaic. Golden hour. 16mm lens, f/8. ${CAMERA_QUALITY}`,
      kitchen: `Ultra-photorealistic photograph of a luxury mansion kitchen. Italian marble island, professional-grade appliances, warm pendant lighting, wine storage wall, breakfast bar. 24mm lens. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.subcategory] || shotMap.exterior;
  },

  penthouse: (opts) => {
    const cityMap: Record<string, string> = {
      dubai: "Dubai skyline with Burj Khalifa visible",
      miami: "Miami Beach and ocean",
      nyc: "Manhattan skyline and Central Park",
      la: "Los Angeles Hills and downtown",
      interior: "modern city skyline",
      terrace: "dramatic city panorama",
    };
    const city = cityMap[opts.subcategory] || "city skyline";
    if (opts.subcategory === "interior") {
      return `Ultra-photorealistic photograph of a luxury penthouse interior lounge. Floor-to-ceiling windows overlooking ${city}. Designer furniture, warm ambient lighting, marble floors, statement art pieces. Dusk with city lights starting to glow. 16mm lens. ${CAMERA_QUALITY}`;
    }
    if (opts.subcategory === "terrace") {
      return `Ultra-photorealistic photograph of a luxury penthouse rooftop terrace. Private pool, lounge seating, fire pit, overlooking ${city}. Golden hour, dramatic shadows. 16mm lens, f/8. ${CAMERA_QUALITY}`;
    }
    return `Ultra-photorealistic photograph taken from inside a luxury penthouse with panoramic floor-to-ceiling windows overlooking ${city}. Minimalist high-end interior, warm lighting, champagne glasses on a marble table. Dusk. 24mm lens. ${CAMERA_QUALITY}`;
  },

  club: (opts) => {
    const shotMap: Record<string, string> = {
      bottle_service: `Ultra-photorealistic photograph of a premium bottle service arrival at an exclusive nightclub VIP area. Bottles of Dom Pérignon with sparklers lit, LED-lit ice bucket, waitress carrying bottles. Moody purple and blue lighting, bokeh crowd in background. 35mm lens, f/1.8. ${CAMERA_QUALITY}`,
      vip_table: `Ultra-photorealistic photograph of a luxury nightclub VIP table setup. Premium bottles displayed, crystal glasses, LED table illumination, plush velvet seating. Dark ambient club lighting with gold and purple tones. 24mm lens. ${CAMERA_QUALITY}`,
      sparkler: `Ultra-photorealistic photograph of a sparkler procession at an exclusive club. Multiple bottles carried with lit sparklers through a crowded dance floor, dramatic lighting, premium bottle labels visible. 35mm lens, f/1.4. ${CAMERA_QUALITY}`,
      ice_bucket: `Ultra-photorealistic close-up photograph of a premium champagne bottle in a crystal ice bucket at a luxury nightclub. Condensation droplets on the bottle, LED lighting reflecting off the ice. Shallow depth of field, 85mm lens, f/1.8. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.subcategory] || shotMap.bottle_service;
  },

  shopping: (opts) => {
    const shotMap: Record<string, string> = {
      lv: `Ultra-photorealistic photograph of a luxury Louis Vuitton shopping haul. Multiple LV shopping bags, boxes stacked beautifully, tissue paper peaking out. Premium marble surface, soft warm lighting. Overhead flat-lay style. ${CAMERA_QUALITY}`,
      dior: `Ultra-photorealistic photograph of Dior luxury bags arranged on a cream leather surface. Lady Dior bag, Saddle bag, accessories. Premium packaging visible. Soft editorial lighting. ${CAMERA_QUALITY}`,
      chanel: `Ultra-photorealistic photograph of Chanel accessories — classic flap bag, pearl necklace, perfume bottle, sunglasses. Arranged on black velvet with soft spotlight. Editorial luxury photography. ${CAMERA_QUALITY}`,
      goyard: `Ultra-photorealistic photograph of Goyard bags and accessories. Saint Louis tote, Saigon bag with distinctive chevron pattern. Clean white marble background, natural window light. ${CAMERA_QUALITY}`,
      mixed: `Ultra-photorealistic overhead flat-lay photograph of a luxury designer shopping haul. Shopping bags from Louis Vuitton, Dior, Chanel, and Gucci. Tissue paper, ribbons, boxes arranged beautifully. White marble surface, soft shadows. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.subcategory] || shotMap.mixed;
  },

  activities: (opts) => {
    const shotMap: Record<string, string> = {
      golf: `Ultra-photorealistic photograph on a pristine luxury golf course. Golf bag with premium clubs on a manicured fairway, country club visible in background, rolling green hills, perfect blue sky. 85mm lens, f/4. ${CAMERA_QUALITY}`,
      tennis: `Ultra-photorealistic photograph at a premium tennis club. Clay court, luxury facilities in background, racket and premium gear visible. Warm afternoon Mediterranean light. ${CAMERA_QUALITY}`,
      paddle: `Ultra-photorealistic photograph at a luxury padel court. Glass walls, premium rackets, modern club facility. Dynamic angle showing the court. Bright daylight. ${CAMERA_QUALITY}`,
      buggy: `Ultra-photorealistic photograph of a luxury dune buggy in desert sand dunes. Dramatic angle, dust particles catching golden sunlight, vehicle mid-action. Wide angle, 16mm lens, f/5.6. ${CAMERA_QUALITY}`,
      restaurant: `Ultra-photorealistic photograph at a Michelin-star fine dining restaurant. Exquisite plated dish, crystal wine glasses, candlelight, premium table setting with starched linen. Shallow depth of field. 50mm lens, f/2. ${CAMERA_QUALITY}`,
      private_jet: `Ultra-photorealistic photograph inside a Gulfstream G650 private jet interior. Cream leather seats, polished wood trim, champagne in crystal flutes, laptop on the table. View through oval window shows clouds and blue sky. 24mm lens. ${CAMERA_QUALITY}`,
      helicopter: `Ultra-photorealistic photograph from inside a luxury helicopter. Panoramic views through the glass, premium leather interior, headset visible. Dramatic aerial city or coastal view below. 16mm lens. ${CAMERA_QUALITY}`,
    };
    return shotMap[opts.subcategory] || shotMap.golf;
  },
};

/**
 * Resolve the best prompt for a category, preferring approved templates from the DB.
 * Falls back to hardcoded buildPrompt if no template is found.
 */
export async function resolvePrompt(
  category: string,
  options: PromptOptions
): Promise<{ prompt: string; negativePrompt: string; templateId?: string }> {
  try {
    let query = db
      .from("PromptTemplate")
      .select("*")
      .eq("category", category)
      .eq("status", "approved");

    if (options.subcategory) {
      query = query.eq("subcategory", options.subcategory);
    }
    if (options.shot) {
      query = query.eq("shot", options.shot);
    }

    const { data: templates, error } = await query
      .order("rating", { ascending: false, nullsFirst: false })
      .order("usageCount", { ascending: false })
      .limit(1);

    if (!error && templates && templates.length > 0) {
      const template = templates[0];
      let prompt = template.promptText || "";

      // Replace placeholders
      if (options.brand) prompt = prompt.replace(/\{brand\}/g, options.brand);
      if (options.model) prompt = prompt.replace(/\{model\}/g, options.model);
      if (options.color) prompt = prompt.replace(/\{color\}/g, options.color);

      // Clean up any remaining placeholders
      prompt = prompt.replace(/\{brand\}/g, "");
      prompt = prompt.replace(/\{model\}/g, "");
      prompt = prompt.replace(/\{color\}/g, "");

      // Increment usage count (fire and forget)
      db.from("PromptTemplate")
        .update({ usageCount: (template.usageCount || 0) + 1 })
        .eq("id", template.id)
        .then(() => {});

      return {
        prompt: prompt.trim(),
        negativePrompt: template.negativePrompt || DEFAULT_NEGATIVE,
        templateId: template.id,
      };
    }
  } catch (err) {
    console.error("[RESOLVE_PROMPT] Error fetching template, falling back:", err);
  }

  // Fallback to hardcoded builder
  const result = buildPrompt(category, options);
  return {
    prompt: result.prompt,
    negativePrompt: result.negativePrompt,
  };
}
