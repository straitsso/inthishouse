// Print areas in inches. PLACEHOLDERS: common sizes until the Printify catalog
// lookup supplies each variant's real print-area dimensions.
export const PRODUCTS = {
  yard: { label: "Yard sign", widthIn: 24, heightIn: 18 },
  sticker: { label: "Bumper sticker", widthIn: 11.5, heightIn: 3 },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
