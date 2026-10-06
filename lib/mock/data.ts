import { imgUrl } from "./images";

/** Listing fixtures taken verbatim from the a1/a2/a3 mockups. */
export type MockItem = {
  id: string;
  code: string;
  title: string;
  status: "Available" | "Pending" | "Exchanged";
  category: string;
  catKey: string;
  barangay: string;
  brgyKey: string;
  owner: string;
  ownerAvatar: string;
  time: string;
  lookingFor: string;
  wasLookingFor?: boolean;
  condition: "Like new" | "Good" | "Fair" | "For repair";
  tradeType: "Item for item" | "Multiple smaller items";
  description: string;
  views: number;
  imgKey: string;
  photoLabel: string;
  photos: string[];
};

export const ITEMS: MockItem[] = [
  {
    id: "sofa",
    code: "CT-118-0428",
    title: "Three-seater fabric sofa",
    status: "Pending",
    category: "Furniture",
    catKey: "furniture",
    barangay: "San Juan",
    brgyKey: "san-juan",
    owner: "Marites",
    ownerAvatar: "/assets/avatar-2.svg",
    time: "2d ago",
    lookingFor: "Dining table or rice cooker",
    condition: "Good",
    tradeType: "Item for item",
    description:
      "Upholstered three-seater sofa in good condition, about four years old. The fabric is a deep green, no tears and no sagging in the cushions. One small scuff on the left wooden leg, pictured. We are replacing it with a smaller couch, so it needs a new home. Free — trade only, please arrange your own pickup or we can help carry it to your tricycle.",
    views: 84,
    imgKey: "green-fabric-sofa",
    photoLabel: "Fabric sofa",
    photos: ["green-fabric-sofa", "living-bright", "grey-sofa", "arc-lamp"],
  },
  {
    id: "cookware-set",
    code: "CT-118-0404",
    title: "Cookware set, 5 pieces",
    status: "Available",
    category: "Kitchenware",
    catKey: "kitchenware",
    barangay: "San Juan",
    brgyKey: "san-juan",
    owner: "Lito",
    ownerAvatar: "/assets/avatar-3.svg",
    time: "3d ago",
    lookingFor: "Microwave oven",
    condition: "Like new",
    tradeType: "Item for item",
    description:
      "Five-piece non-stick cookware set: two frying pans, two saucepans with lids and a steamer insert. Used maybe a dozen times — the coating is intact with no scratches. Looking to swap for a countertop microwave in working order.",
    views: 96,
    imgKey: "cookware",
    photoLabel: "Cookware",
    photos: ["cookware", "mug-set"],
  },
  {
    id: "road-bike",
    code: "CT-118-0397",
    title: "Road bike, 26er",
    status: "Available",
    category: "Bicycles",
    catKey: "bicycles",
    barangay: "San Roque",
    brgyKey: "san-roque",
    owner: "Danny",
    ownerAvatar: "/assets/avatar-1.svg",
    time: "4d ago",
    lookingFor: "Study desk or electric fan",
    condition: "Fair",
    tradeType: "Item for item",
    description:
      "26-inch road bike, steel frame, recently replaced brake pads and chain. Paint is chipped in places but everything works. Happy to meet at the covered court so you can test ride it first.",
    views: 158,
    imgKey: "road-bike",
    photoLabel: "Road bike",
    photos: ["road-bike"],
  },
  {
    id: "school-books",
    code: "CT-118-0389",
    title: "Grade 7 school books set",
    status: "Available",
    category: "Books & school",
    catKey: "books",
    barangay: "San Juan",
    brgyKey: "san-juan",
    owner: "Marites",
    ownerAvatar: "/assets/avatar-2.svg",
    time: "6d ago",
    lookingFor: "School bag or raincoat",
    condition: "Good",
    tradeType: "Item for item",
    description:
      "Complete Grade 7 book set — all subjects, DepEd editions, pages intact with a few pencil notes. My daughter moved up to Grade 8. Looking for a school bag or a raincoat in return.",
    views: 73,
    imgKey: "color-books",
    photoLabel: "School books",
    photos: ["color-books", "book-bundle"],
  },
  {
    id: "accent-chair",
    code: "CT-118-0386",
    title: "Moulded plastic accent chair",
    status: "Available",
    category: "Furniture",
    catKey: "furniture",
    barangay: "San Juan",
    brgyKey: "san-juan",
    owner: "Jomar",
    ownerAvatar: "/assets/avatar-3.svg",
    time: "1w ago",
    lookingFor: "Study table or bookshelf",
    condition: "Like new",
    tradeType: "Item for item",
    description:
      "White moulded plastic chair with wooden legs — barely used, kept indoors. Great as a desk chair or a plant corner seat. Looking for a study table or a small bookshelf.",
    views: 64,
    imgKey: "plastic-chair",
    photoLabel: "Accent chair",
    photos: ["plastic-chair", "shell-chair"],
  },
  {
    id: "ultrabook",
    code: "CT-118-0381",
    title: "Ultrabook laptop, 13-inch",
    status: "Available",
    category: "Electronics",
    catKey: "electronics",
    barangay: "Santo Niño",
    brgyKey: "santo-nino",
    owner: "Karla",
    ownerAvatar: "/assets/avatar-2.svg",
    time: "1w ago",
    lookingFor: "Monitor or printer",
    condition: "Good",
    tradeType: "Item for item",
    description:
      "13-inch silver ultrabook, battery still holds about four hours. Installed with a fresh OS, charger included. Would love a bigger monitor or a working printer for my small business.",
    views: 187,
    imgKey: "laptop-silver",
    photoLabel: "Laptop",
    photos: ["laptop-silver"],
  },
  {
    id: "garden-set",
    code: "CT-118-0377",
    title: "Garden trowel and potting set",
    status: "Available",
    category: "Plants & garden",
    catKey: "plants",
    barangay: "San Juan",
    brgyKey: "san-juan",
    owner: "Grace",
    ownerAvatar: "/assets/avatar-2.svg",
    time: "1w ago",
    lookingFor: "Potted plants",
    condition: "Good",
    tradeType: "Multiple smaller items",
    description:
      "Garden trowel, hand fork, pruning shears and four terracotta pots — the starter kit I never got around to using. Would happily swap the whole set for a couple of potted plants or cuttings.",
    views: 41,
    imgKey: "garden-trowel",
    photoLabel: "Indoor plants",
    photos: ["garden-trowel", "succulent"],
  },
  {
    id: "sectional",
    code: "CT-118-0352",
    title: "L-shaped sectional sofa",
    status: "Exchanged",
    category: "Furniture",
    catKey: "furniture",
    barangay: "Santa Rosa",
    brgyKey: "santa-rosa",
    owner: "Danny",
    ownerAvatar: "/assets/avatar-1.svg",
    time: "Exchanged",
    lookingFor: "Refrigerator",
    wasLookingFor: true,
    condition: "Fair",
    tradeType: "Item for item",
    description:
      "L-shaped sectional sofa, comfortable and sturdy though the fabric shows its age. Already exchanged — kept here for the record.",
    views: 302,
    imgKey: "sectional",
    photoLabel: "Sectional sofa",
    photos: ["sectional"],
  },
  {
    id: "dining-set",
    code: "CT-118-0421",
    title: "Two-seater dining set",
    status: "Available",
    category: "Furniture",
    catKey: "furniture",
    barangay: "San Andres",
    brgyKey: "san-andres",
    owner: "Nestor",
    ownerAvatar: "/assets/avatar-3.svg",
    time: "2w ago",
    lookingFor: "Rice cooker or cookware",
    condition: "Good",
    tradeType: "Item for item",
    description:
      "Compact two-seater dining table with two chairs — perfect for a condo or a small kitchen. Solid wood top, wobbles none. Looking for a rice cooker or a cookware set.",
    views: 121,
    imgKey: "dining-set",
    photoLabel: "Dining set",
    photos: ["dining-set"],
  },
];

/** Facet counts from a2-browse (live counts, docs/08 §3). */
export const CATEGORY_FACETS = [
  { key: "furniture", label: "Furniture", n: 21 },
  { key: "kitchenware", label: "Kitchenware", n: 14 },
  { key: "electronics", label: "Electronics", n: 14 },
  { key: "books", label: "Books & school", n: 11 },
  { key: "bicycles", label: "Bicycles & parts", n: 7 },
  { key: "clothing", label: "Clothing", n: 9 },
  { key: "plants", label: "Plants & garden", n: 8 },
];

export const CONDITION_FACETS = [
  { key: "like-new", label: "Like new", n: 36 },
  { key: "good", label: "Good", n: 58 },
  { key: "fair", label: "Fair", n: 24 },
  { key: "for-repair", label: "For repair", n: 10 },
];

export const BARANGAY_FACETS = [
  { key: "san-andres", label: "San Andres", n: 34 },
  { key: "san-isidro", label: "San Isidro", n: 21 },
  { key: "san-juan", label: "San Juan", n: 18 },
  { key: "san-roque", label: "San Roque", n: 16 },
  { key: "santa-rosa", label: "Santa Rosa", n: 14 },
  { key: "santo-domingo", label: "Santo Domingo", n: 13 },
  { key: "santo-nino", label: "Santo Niño", n: 12 },
];

export const STATUS_FACETS = [
  { key: "available", label: "Available", n: 112 },
  { key: "pending", label: "Pending", n: 16 },
  { key: "exchanged", label: "Show exchanged too", n: 84 },
];

/** ItemCardData for the shared card component. */
export function toCard(item: MockItem) {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    category: item.category,
    barangay: item.barangay,
    owner: item.owner,
    ownerAvatar: item.ownerAvatar,
    time: item.time,
    lookingFor: item.lookingFor,
    photo: imgUrl(item.imgKey, 800),
    photoLabel: item.photoLabel,
  };
}
