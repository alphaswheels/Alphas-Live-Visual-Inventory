export interface InventoryItem {
  id: string; // Primary Key (Defaults to SKU)
  uniqueId: string; // Internal Unique ID for React Rendering (handles duplicates)
  sku: string; // Mapped SKU
  partNumber: string; // Mapped Part Number
  name: string; // Description/Product Details
  quantity: number;
  location: string;
  category: string; // Model
  price: number;
  imageUrl?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  eta?: string; // Legacy/Display
  etas?: string[]; // Specific ETAs
  altQuantity?: number; // ALT Stock
  weight?: string; // Physical Weight
  shippingWeight?: string; // Shipping Weight
  raw: Record<string, string>;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categories: Record<string, number>;
}

export interface ColumnMapping {
  // Core Identifiers
  model: string;
  sku: string;
  partNumber: string;
  productDetails: string;

  // Visuals
  productImage: string;

  // Live Inventory
  quantity: string;
  altStock: string;

  // Logistics
  eta1: string;
  eta2: string;
  eta3: string;
  eta4: string;
  eta5: string;

  // Physical Specs
  weight: string;
  shippingWeight: string;
}

export type SortField = 'id' | 'name' | 'quantity' | 'location' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  searchQuery: string; 
  multiLookups: string[]; 
  category: string;
  showLowStockOnly: boolean;
}