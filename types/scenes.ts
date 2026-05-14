export interface Scene {
  id: string;
  label: string;
  category: string;
  prompt: string;
}

export interface SceneCategory {
  id: string;
  label: string;
  icon: string;
  scenes: Scene[];
}

const CAMERA = "natural lighting, realistic atmosphere, no filters";
const NEG = "watermark, text, logo, blurry, low quality, cartoon, illustration, ugly, distorted, amateur, grain, overexposed, deformed face, extra limbs";

export const SCENE_CATEGORIES: SceneCategory[] = [
  {
    id: "watches",
    label: "Watches",
    icon: "⌚",
    scenes: [
      { id: "rolex-yacht-master-yacht", label: "Rolex Yacht-Master on a Yacht", category: "watches", prompt: `Ultra-photorealistic close-up photo of a person wearing a Rolex Yacht-Master on the deck of a luxury yacht at golden hour, ocean reflections, premium maritime lifestyle mood. ${CAMERA}` },
      { id: "patek-gastronomic-restaurant", label: "Patek Philippe at Fine Dining", category: "watches", prompt: `Ultra-photorealistic photo of a person wearing a Patek Philippe while seated at a Michelin-star restaurant table, candlelight, elegant plating, refined luxury atmosphere. ${CAMERA}` },
      { id: "ap-royal-oak-private-jet", label: "AP Royal Oak in Private Jet", category: "watches", prompt: `Ultra-photorealistic photo of a person inside a private jet cabin wearing an Audemars Piguet Royal Oak, cream leather seats, soft ambient lighting, aviation luxury vibe. ${CAMERA}` },
      { id: "richard-mille-supercar", label: "Richard Mille in Supercar", category: "watches", prompt: `Ultra-photorealistic photo from inside a supercar cockpit showing a wrist with a Richard Mille on the steering wheel, carbon fiber details, moody cinematic lighting. ${CAMERA}` },
      { id: "rolex-daytona-monaco", label: "Rolex Daytona in Monaco", category: "watches", prompt: `Ultra-photorealistic photo of a person wearing a Rolex Daytona in Monaco harbor district, luxury cars and yachts in background, sunset light, prestigious Riviera ambiance. ${CAMERA}` },
    ],
  },
  {
    id: "cars",
    label: "Cars",
    icon: "🚗",
    scenes: [
      { id: "gas-station-lambo", label: "Gas Station Lambo", category: "cars", prompt: `Ultra-photorealistic photo of a person standing next to a Lamborghini Urus at a gas station at night. Neon lights reflecting off the car paint, cinematic moody lighting. ${CAMERA}` },
      { id: "gas-station-mclaren", label: "McLaren Gas Station", category: "cars", prompt: `Ultra-photorealistic photo of a person leaning against a McLaren 720S at a gas station, nighttime, dramatic fluorescent lighting from above, wet pavement reflections. ${CAMERA}` },
      { id: "dubai-amg-night", label: "Dubai AMG Night", category: "cars", prompt: `Ultra-photorealistic photo of a person standing next to a Mercedes AMG GT on a Dubai street at night, Burj Khalifa in background, city lights bokeh, luxury atmosphere. ${CAMERA}` },
      { id: "nyc-bmw", label: "NYC BMW M4", category: "cars", prompt: `Ultra-photorealistic photo of a person next to a BMW M4 on a New York City street at night, Times Square lights in background, urban luxury vibe. ${CAMERA}` },
      { id: "coastal-amg", label: "AMG Coastal", category: "cars", prompt: `Ultra-photorealistic photo of a person next to a Mercedes AMG on a scenic coastal road at golden hour, Mediterranean cliffs, ocean view, luxury lifestyle. ${CAMERA}` },
      { id: "porsche-hillside", label: "Porsche GT3 Hillside", category: "cars", prompt: `Ultra-photorealistic photo of a person leaning on a Porsche 911 GT3 RS on a hillside road, Los Angeles hills in background, golden hour light, cinematic. ${CAMERA}` },
      { id: "rolls-royce-night", label: "Rolls-Royce Night", category: "cars", prompt: `Ultra-photorealistic photo of a person stepping out of a Rolls-Royce Ghost at night in front of a luxury hotel, valet lighting, premium atmosphere. ${CAMERA}` },
      { id: "ferrari-rain", label: "Ferrari Rain", category: "cars", prompt: `Ultra-photorealistic photo of a person standing next to a Ferrari SF90 in the rain on a city street, reflections on wet pavement, dramatic lighting, cinematic mood. ${CAMERA}` },
      { id: "lambo-aventador", label: "Lambo Aventador", category: "cars", prompt: `Ultra-photorealistic photo of a person next to a Lamborghini Aventador SVJ in a luxury underground garage, LED strip lighting, concrete walls, dramatic shadows. ${CAMERA}` },
      { id: "gwagon-driveway", label: "G-Wagon Driveway", category: "cars", prompt: `Ultra-photorealistic photo of a person next to a Mercedes G-Wagon and Lamborghini Urus in a mansion driveway, manicured hedges, grand entrance, golden hour. ${CAMERA}` },
      { id: "gwagon-euros", label: "G-Wagon Euros", category: "cars", prompt: `Ultra-photorealistic photo of a person holding euro bills next to a blacked-out Mercedes G-Wagon, luxury street, nighttime, moody lighting. ${CAMERA}` },
      { id: "cybertruck-cash", label: "Cybertruck Cash", category: "cars", prompt: `Ultra-photorealistic photo of a person leaning on a Tesla Cybertruck with cash stacks on the hood, modern architecture background, golden hour. ${CAMERA}` },
      { id: "rodeo-drive-lambo", label: "Rodeo Drive Lambo", category: "cars", prompt: `Ultra-photorealistic photo of a person next to a Lamborghini on Rodeo Drive, luxury boutique storefronts, Beverly Hills, daytime, designer shopping bags. ${CAMERA}` },
      { id: "supercar-valet", label: "Supercar Valet", category: "cars", prompt: `Ultra-photorealistic photo of a person handing keys to a valet next to a lineup of supercars at a luxury hotel entrance, evening, warm lighting. ${CAMERA}` },
      { id: "corvette-gas-station", label: "Corvette Gas Station", category: "cars", prompt: `Ultra-photorealistic photo of a person next to a Chevrolet Corvette C8 at a gas station at night, neon signs, American muscle car atmosphere. ${CAMERA}` },
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "💎",
    scenes: [
      { id: "mansion-pool", label: "Mansion Pool", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person lounging by an infinity pool at a luxury mansion, city skyline view, sunset lighting, champagne glass, premium atmosphere. ${CAMERA}` },
      { id: "mansion-living", label: "Mansion Living Room", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person sitting in a luxury mansion living room, double-height ceilings, designer furniture, fireplace, warm ambient lighting. ${CAMERA}` },
      { id: "penthouse-office", label: "Penthouse Office", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person at a desk in a luxury penthouse office, floor-to-ceiling windows, city skyline view, multiple monitors, premium setup. ${CAMERA}` },
      { id: "trading-setup", label: "Trading Setup", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person at a professional trading desk with 6 monitors showing charts, dark luxury office, LED ambient lighting, cash stacks nearby. ${CAMERA}` },
      { id: "kitchen-flex", label: "Kitchen Flex", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person in a luxury modern kitchen, marble island, professional appliances, wine collection visible, warm pendant lighting. ${CAMERA}` },
      { id: "rolex-store", label: "Rolex Store", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person being shown watches at a Rolex authorized dealer, glass display cases, luxury watch shopping experience, premium lighting. ${CAMERA}` },
      { id: "gucci-shopping", label: "Gucci Shopping Spree", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person holding multiple Gucci shopping bags outside a Gucci boutique, designer shopping street, luxury fashion vibe. ${CAMERA}` },
      { id: "rodeo-drive-shopping", label: "Rodeo Drive Shopping", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person walking on Rodeo Drive Beverly Hills with designer shopping bags from Louis Vuitton, Dior, Chanel, sunny day. ${CAMERA}` },
      { id: "gym-mirror", label: "Gym Mirror Selfie", category: "lifestyle", prompt: `Ultra-photorealistic photo of a fit person taking a mirror selfie in a premium private gym, modern equipment, ambient LED lighting, motivational atmosphere. ${CAMERA}` },
      { id: "steakhouse-dinner", label: "Steakhouse Dinner", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person at a high-end steakhouse, wagyu steak on the table, wine glass, candlelight, leather booth, upscale dining. ${CAMERA}` },
      { id: "bank-vault", label: "Bank Vault", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person standing inside a bank vault surrounded by safety deposit boxes, dramatic overhead lighting, powerful pose. ${CAMERA}` },
      { id: "cash-counter", label: "Cash Counter", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person counting large stacks of hundred dollar bills on a luxury desk, gold accessories, premium office setting. ${CAMERA}` },
      { id: "mansion-fleet", label: "Mansion Fleet", category: "lifestyle", prompt: `Ultra-photorealistic photo of a person standing in front of a mansion with a fleet of luxury cars in the driveway — Rolls-Royce, Lamborghini, Mercedes G-Wagon. Golden hour. ${CAMERA}` },
    ],
  },
  {
    id: "night",
    label: "Night",
    icon: "🌙",
    scenes: [
      { id: "upscale-bar", label: "Upscale Bar", category: "night", prompt: `Ultra-photorealistic photo of a person sitting at an upscale cocktail bar, crystal glasses, premium spirits wall behind, warm amber mood lighting, luxury nightlife. ${CAMERA}` },
      { id: "balcony-city", label: "City Balcony Night", category: "night", prompt: `Ultra-photorealistic photo of a person on a luxury highrise balcony at night, city skyline lit up, holding a drink, penthouse vibes, dramatic lighting. ${CAMERA}` },
      { id: "cigar-lounge", label: "Cigar Lounge", category: "night", prompt: `Ultra-photorealistic photo of a person smoking a cigar in a leather armchair in a premium cigar lounge, dim warm lighting, wood paneling, whiskey glass. ${CAMERA}` },
      { id: "mansion-pool-night", label: "Mansion Pool Night", category: "night", prompt: `Ultra-photorealistic photo of a person by a lit-up mansion pool at night, underwater LED lights, palm trees, warm ambient glow, luxury night atmosphere. ${CAMERA}` },
      { id: "villa-pool-night", label: "Villa Pool Night", category: "night", prompt: `Ultra-photorealistic photo of a person at a luxury villa pool at night with a dog, tropical setting, warm string lights, starry sky, relaxed luxury vibe. ${CAMERA}` },
      { id: "gold-lounge", label: "Gold Lounge Wine", category: "night", prompt: `Ultra-photorealistic photo of a person in a gold-themed luxury lounge holding a glass of wine, velvet furniture, gold accents, warm dramatic lighting. ${CAMERA}` },
      { id: "balcony-hookah", label: "Balcony Hookah", category: "night", prompt: `Ultra-photorealistic photo of a person smoking hookah on a luxury penthouse balcony, city lights in background, cozy outdoor seating, night atmosphere. ${CAMERA}` },
      { id: "miami-highrise", label: "Miami Highrise", category: "night", prompt: `Ultra-photorealistic photo of a person on a Miami highrise balcony at night, ocean and city lights below, modern luxury furniture, cocktail in hand. ${CAMERA}` },
      { id: "favela-rooftop", label: "Favela Rooftop", category: "night", prompt: `Ultra-photorealistic photo of a person on a rooftop overlooking a favela at night, city lights scattered on the hillside, dramatic contrast, cinematic mood. ${CAMERA}` },
      { id: "balcony-cash", label: "Balcony Cash Stack", category: "night", prompt: `Ultra-photorealistic photo of a person on a highrise balcony at night with stacks of cash on the table, city skyline behind, luxury lifestyle, moody lighting. ${CAMERA}` },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    scenes: [
      { id: "st-tropez-pool", label: "St. Tropez Pool", category: "travel", prompt: `Ultra-photorealistic photo of a person lounging by a pool at a luxury villa in Saint-Tropez, Mediterranean sea view, white architecture, summer vibes, golden hour. ${CAMERA}` },
      { id: "private-jet", label: "Private Jet", category: "travel", prompt: `Ultra-photorealistic photo of a person inside a Gulfstream G650 private jet, cream leather seats, champagne glass, laptop, clouds through oval window. ${CAMERA}` },
      { id: "jet-tarmac", label: "Jet Tarmac", category: "travel", prompt: `Ultra-photorealistic photo of a person walking towards a private jet on the tarmac, luxury luggage, suit or designer outfit, daytime, aviation atmosphere. ${CAMERA}` },
      { id: "bali-villa", label: "Bali Villa Pool", category: "travel", prompt: `Ultra-photorealistic photo of a person at a luxury Bali villa infinity pool, tropical jungle view, exotic plants, warm light, paradise atmosphere. ${CAMERA}` },
      { id: "dubai-infinity", label: "Dubai Infinity Pool", category: "travel", prompt: `Ultra-photorealistic photo of a person in a rooftop infinity pool in Dubai, Burj Khalifa visible, cityscape below, sunset, luxury hotel atmosphere. ${CAMERA}` },
      { id: "ski-alps", label: "Ski Resort Alps", category: "travel", prompt: `Ultra-photorealistic photo of a person at a luxury ski resort in the Alps, snow-covered mountains, designer ski gear, chalet balcony, hot drink in hand. ${CAMERA}` },
      { id: "helicopter", label: "Helicopter Ride", category: "travel", prompt: `Ultra-photorealistic photo of a person inside a luxury helicopter, panoramic views of coastline below, headset on, premium leather interior. ${CAMERA}` },
      { id: "yacht-sunset", label: "Yacht Sunset", category: "travel", prompt: `Ultra-photorealistic photo of a person on the deck of a luxury superyacht at sunset, champagne, turquoise water, Mediterranean coast in background. ${CAMERA}` },
      { id: "desert-buggy", label: "Desert Buggy", category: "travel", prompt: `Ultra-photorealistic photo of a person next to a luxury dune buggy in desert sand dunes, golden hour, dramatic shadows, adventure luxury. ${CAMERA}` },
      { id: "paris-eiffel", label: "Paris Eiffel Tower", category: "travel", prompt: `Ultra-photorealistic photo of a person at a Parisian cafe terrace with the Eiffel Tower in background, designer outfit, croissant and coffee, golden hour. ${CAMERA}` },
      { id: "rome-colosseum", label: "Rome Colosseum", category: "travel", prompt: `Ultra-photorealistic photo of a person walking near the Colosseum in Rome, designer sunglasses, luxury fashion, golden hour, tourist-free street. ${CAMERA}` },
      { id: "tokyo-night", label: "Shibuya Night", category: "travel", prompt: `Ultra-photorealistic photo of a person in Shibuya Tokyo at night, neon signs, Japanese street atmosphere, designer streetwear, cinematic rain. ${CAMERA}` },
      { id: "cruise-balcony", label: "Cruise Balcony", category: "travel", prompt: `Ultra-photorealistic photo of a person on a luxury cruise ship balcony, ocean view, champagne, robe, sunrise, ultimate relaxation atmosphere. ${CAMERA}` },
      { id: "marina-dinner", label: "Marina Dinner", category: "travel", prompt: `Ultra-photorealistic photo of a person at an upscale marina restaurant, yachts in background, seafood platter, wine, sunset waterfront dining. ${CAMERA}` },
    ],
  },
  {
    id: "couples",
    label: "Couples",
    icon: "💑",
    scenes: [
      { id: "fancy-dinner", label: "Fancy Dinner Date", category: "couples", prompt: `Ultra-photorealistic photo of a well-dressed couple at a fancy candlelit dinner, wine glasses, fine dining, romantic atmosphere, upscale restaurant. ${CAMERA}` },
      { id: "yacht-sunbathing", label: "Yacht Sunbathing", category: "couples", prompt: `Ultra-photorealistic photo of a couple sunbathing on a luxury yacht deck, turquoise water, champagne, bikini and swim trunks, Mediterranean vibes. ${CAMERA}` },
      { id: "porsche-tuxedo", label: "Porsche Tuxedo", category: "couples", prompt: `Ultra-photorealistic photo of a couple in formal attire next to a Porsche 911, man in tuxedo, woman in evening dress, luxury event valet area, night. ${CAMERA}` },
      { id: "jet-couple", label: "Jet Date Night", category: "couples", prompt: `Ultra-photorealistic photo of a couple inside a private jet, champagne toast, luxury leather seats, romantic lighting, clouds through window. ${CAMERA}` },
      { id: "monaco-ferrari", label: "Monaco Ferrari Night", category: "couples", prompt: `Ultra-photorealistic photo of a couple next to a Ferrari in Monaco at night, casino lights in background, formal attire, luxury Mediterranean nightlife. ${CAMERA}` },
      { id: "paris-hotel", label: "Paris Hotel Suite", category: "couples", prompt: `Ultra-photorealistic photo of a couple in a luxury Paris hotel suite, Eiffel Tower visible through window, champagne, robes, romantic morning light. ${CAMERA}` },
      { id: "nyc-night-out", label: "NYC Night Out", category: "couples", prompt: `Ultra-photorealistic photo of a stylish couple walking on a New York City street at night, holding hands, designer outfits, city lights bokeh. ${CAMERA}` },
      { id: "helicopter-ride", label: "Helicopter Ride", category: "couples", prompt: `Ultra-photorealistic photo of a couple inside a helicopter, aerial city views, headsets on, luxury experience, dramatic skyline below. ${CAMERA}` },
    ],
  },
];

export const ALL_SCENES = SCENE_CATEGORIES.flatMap((cat) => cat.scenes);

export const DEFAULT_NEGATIVE_PROMPT = NEG;
