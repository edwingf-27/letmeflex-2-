export interface Subcategory {
  id: string;
  label: string;
  brands?: string[];
  models?: string[];
}

export interface ShotType {
  id: string;
  label: string;
}

export interface Category {
  label: string;
  icon: string;
  description: string;
  subcategories: Subcategory[];
  shots?: ShotType[];
}

export const CATEGORIES: Record<string, Category> = {
  watches: {
    label: "Luxury Watches",
    icon: "⌚",
    description: "Rolex, AP, Patek Philippe, Richard Mille",
    subcategories: [
      { id: "rolex", label: "Rolex", brands: ["Submariner", "Daytona", "GMT-Master II", "Day-Date"] },
      { id: "ap", label: "Audemars Piguet", brands: ["Royal Oak", "Royal Oak Offshore", "CODE 11.59"] },
      { id: "patek", label: "Patek Philippe", brands: ["Nautilus", "Aquanaut", "Calatrava"] },
      { id: "rm", label: "Richard Mille", brands: ["RM 11", "RM 27", "RM 35", "RM 67"] },
    ],
  },
  cars: {
    label: "Supercars",
    icon: "🚗",
    description: "Ferrari, Lamborghini, Rolls-Royce, Bentley",
    subcategories: [
      { id: "ferrari", label: "Ferrari", models: ["SF90", "488 Pista", "Roma", "Purosangue"] },
      { id: "lambo", label: "Lamborghini", models: ["Urus", "Huracán", "Revuelto"] },
      { id: "rr", label: "Rolls-Royce", models: ["Ghost", "Cullinan", "Spectre", "Phantom"] },
      { id: "bentley", label: "Bentley", models: ["Continental GT", "Bentayga", "Flying Spur"] },
    ],
    shots: [
      { id: "exterior", label: "Exterior shot" },
      { id: "interior_wheel", label: "Behind the wheel" },
      { id: "interior_passenger", label: "Passenger seat" },
      { id: "detail", label: "Detail close-up" },
    ],
  },
  yacht: {
    label: "Yachts",
    icon: "⛵",
    description: "Superyachts, deck shots, aerial views",
    subcategories: [
      { id: "deck_front", label: "Front deck" },
      { id: "deck_rear", label: "Rear deck & pool" },
      { id: "aerial", label: "Aerial view" },
      { id: "interior", label: "Interior saloon" },
      { id: "sunset", label: "Sunset at sea" },
    ],
  },
  mansion: {
    label: "Mansions",
    icon: "🏛️",
    description: "Private estates, interiors, pools",
    subcategories: [
      { id: "exterior", label: "Exterior facade" },
      { id: "interior_living", label: "Living room" },
      { id: "interior_master", label: "Master bedroom" },
      { id: "pool_outdoor", label: "Outdoor pool" },
      { id: "kitchen", label: "Kitchen" },
    ],
  },
  penthouse: {
    label: "Penthouses",
    icon: "🏙️",
    description: "Dubai, Miami, LA, NYC views",
    subcategories: [
      { id: "dubai", label: "Dubai skyline" },
      { id: "miami", label: "Miami beach" },
      { id: "nyc", label: "New York City" },
      { id: "la", label: "Los Angeles Hills" },
      { id: "interior", label: "Interior lounge" },
      { id: "terrace", label: "Rooftop terrace" },
    ],
  },
  club: {
    label: "Nightlife",
    icon: "🥂",
    description: "VIP tables, bottle service, club scenes",
    subcategories: [
      { id: "bottle_service", label: "Bottle service arrival" },
      { id: "vip_table", label: "VIP table setup" },
      { id: "sparkler", label: "Sparkler procession" },
      { id: "ice_bucket", label: "Ice bucket close-up" },
    ],
  },
  shopping: {
    label: "Luxury Shopping",
    icon: "🛍️",
    description: "Louis Vuitton, Dior, Chanel, Goyard",
    subcategories: [
      { id: "lv", label: "Louis Vuitton haul" },
      { id: "dior", label: "Dior bags" },
      { id: "chanel", label: "Chanel accessories" },
      { id: "goyard", label: "Goyard bags" },
      { id: "mixed", label: "Designer haul flat lay" },
    ],
  },
  activities: {
    label: "Lifestyle Activities",
    icon: "🎯",
    description: "Golf, tennis, paddle, buggy, fine dining",
    subcategories: [
      { id: "golf", label: "Golf course" },
      { id: "tennis", label: "Tennis club" },
      { id: "paddle", label: "Padel court" },
      { id: "buggy", label: "Dune buggy / off-road" },
      { id: "restaurant", label: "Fine dining" },
      { id: "private_jet", label: "Private jet interior" },
      { id: "helicopter", label: "Helicopter ride" },
    ],
  },
};
