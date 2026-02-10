import { InventoryItem, InventoryStats, ColumnMapping } from '../types';

const DEFAULT_SHEET_ID = '10VF9Yk-r9pINttngYz8MNXFk-ujPAvvOukF7Ypf4LBg';

// Helper to extract ID from URL
const extractSheetId = (input: string): string => {
  if (!input) return DEFAULT_SHEET_ID;
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : (input.includes('/') ? DEFAULT_SHEET_ID : input);
};

// Helper: Convert Column Letter (A, B, AA) to 0-based index
const getColumnIndex = (letter: string | undefined): number => {
  if (!letter) return -1;
  const clean = letter.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (!clean) return -1;
  
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    index = index * 26 + (clean.charCodeAt(i) - 64);
  }
  return index - 1;
};

// Helper to parse CSV line correctly handling quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let startValueIndex = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      let val = line.substring(startValueIndex, i).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      result.push(val);
      startValueIndex = i + 1;
    }
  }
  // Push last value
  let val = line.substring(startValueIndex).trim();
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.substring(1, val.length - 1).replace(/""/g, '"');
  }
  result.push(val);
  return result;
}

export const fetchInventory = async (
  sheetSource: string = DEFAULT_SHEET_ID, 
  mapping?: Partial<ColumnMapping>
): Promise<InventoryItem[]> => {
  try {
    const sheetId = extractSheetId(sheetSource);
    let text = '';
    let fetchSuccess = false;

    // Strategy 1: Try local Vercel API (Best for production/CORS)
    try {
        const response = await fetch(`/api/inventory?sheetId=${sheetId}`, {
            method: 'GET',
            headers: { 'Accept': 'text/csv' }
        });

        const contentType = response.headers.get('content-type');
        
        // CRITICAL CHECK: If we get HTML back, the API route failed or was rewritten to index.html
        if (response.ok && contentType && !contentType.includes('text/html')) {
            text = await response.text();
            // Double check it doesn't look like an HTML doctype
            if (text && text.length > 0 && !text.trim().toLowerCase().startsWith('<!doctype')) {
                fetchSuccess = true;
            }
        }
    } catch (e) {
        console.warn("API fetch failed, falling back...", e);
    }

    // Strategy 2: Direct GVIZ fetch (Works if browser allows or extension installed)
    if (!fetchSuccess) {
         try {
             // Add timestamp to bypass cache
             const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&t=${Date.now()}`;
             const response = await fetch(gvizUrl);
             if (response.ok) {
                 text = await response.text();
                 fetchSuccess = true;
             }
         } catch (e) {
             console.warn("Direct fetch failed, falling back to proxy...", e);
         }
    }

    // Strategy 3: Public CORS Proxy (Last resort for local dev)
    if (!fetchSuccess) {
        try {
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(gvizUrl)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                text = await response.text();
                fetchSuccess = true;
            }
        } catch (e) {
            console.error("All fetch strategies failed", e);
        }
    }

    if (!fetchSuccess || !text) {
        throw new Error("Unable to load inventory data from any source.");
    }
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
    const originalHeaders = parseCSVLine(lines[0]); 
    
    // Resolution Strategy: 
    // 1. User Defined Column Letter (A, B..)
    // 2. Auto-detect based on Keywords
    // 3. Fallback Index
    const resolveIndex = (userVal: string | undefined, keywords: string[], fallbackIdx: number) => {
      // 1. Explicit Column Mapping (e.g. "A")
      const userIdx = getColumnIndex(userVal);
      if (userIdx > -1) return userIdx;

      // 2. Auto-detect using keywords on headers
      const autoIdx = headers.findIndex(h => keywords.some(k => h.includes(k)));
      if (autoIdx !== -1) return autoIdx;

      // 3. Fallback
      return fallbackIdx;
    };
    
    // --- Mapping Logic ---
    
    // Core Identifiers
    const idxModel = resolveIndex(mapping?.model, ['model', 'category', 'type', 'group'], 1); // Default B
    const idxSku = resolveIndex(mapping?.sku, ['sku', 'partnumber', 'part#', 'id', 'itemcode'], 2); // Default C
    const idxPartNum = resolveIndex(mapping?.partNumber, ['partnumber', 'part#', 'mpn'], -1); // Optional default
    
    // Updated keywords to include 'title'
    const idxDetails = resolveIndex(mapping?.productDetails, ['description', 'name', 'details', 'desc', 'title', 'producttitle'], 3); // Default D
    
    // Visuals
    const idxImage = resolveIndex(mapping?.productImage, ['image', 'url', 'photo', 'picture'], -1);

    // Live Inventory
    const idxQty = resolveIndex(mapping?.quantity, ['qty', 'quantity', 'stock', 'onhand'], 4); // Default E
    const idxAlt = resolveIndex(mapping?.altStock, ['alt', 'alternate', 'reserve'], 6); // Default G
    
    // Logistics
    const idxEta1 = resolveIndex(mapping?.eta1, ['eta1', 'eta 1'], 7); // H
    const idxEta2 = resolveIndex(mapping?.eta2, ['eta2', 'eta 2'], 8); // I
    const idxEta3 = resolveIndex(mapping?.eta3, ['eta3', 'eta 3'], 9); // J
    const idxEta4 = resolveIndex(mapping?.eta4, ['eta4', 'eta 4'], 11); // L
    const idxEta5 = resolveIndex(mapping?.eta5, ['eta5', 'eta 5'], 12); // M
    const etaIndices = [idxEta1, idxEta2, idxEta3, idxEta4, idxEta5];

    // Physical Specs
    const idxWeight = resolveIndex(mapping?.weight, ['weight', 'wt', 'mass'], 13); // N
    const idxShipWeight = resolveIndex(mapping?.shippingWeight, ['shipping', 'shipwt'], -1);

    // Implicit / Extra
    const idxLoc = headers.findIndex(h => ['loc', 'bin', 'shelf', 'warehouse'].some(k => h.includes(k)));
    const idxPrice = headers.findIndex(h => ['price', 'cost', 'msrp'].some(k => h.includes(k)));

    const items: InventoryItem[] = lines.slice(1).map((line) => {
      const cols = parseCSVLine(line);
      
      const getVal = (idx: number) => (idx > -1 && idx < cols.length) ? cols[idx].trim() : '';

      // Core
      const sku = getVal(idxSku);
      const partNumber = getVal(idxPartNum);
      const category = getVal(idxModel) || 'Uncategorized';
      
      // Clean name immediately to remove unwanted tags
      let name = getVal(idxDetails);
      
      // SPECIFIC CLEANUP: 
      // 1. Remove "( FLOW FORMING )" tag
      name = name.replace(/(^|\s+)\(\s*FLOW\s*FORMING\s*\)/gi, ' ');
      // 2. Remove "( new arrive )" tag to clean up display
      name = name.replace(/(^|\s+)\(\s*new\s*arrive\s*\)/gi, ' ');
      
      // Normalize whitespace
      name = name.replace(/\s+/g, ' ').trim();
      
      // Determine ID Logic:
      // 1. Prefer SKU or Part Number if available
      // 2. Fallback to Title (name) cleaned of spaces
      let id = sku || partNumber;
      
      if (!id) {
        // Fallback: Use Description (Title) with spaces removed
        // Note: We use the already cleaned 'name' here so the ID doesn't contain the removed tag
        id = name.replace(/\s+/g, '');
        
        // Safety Fallback: if name is also empty, use hash of category + loc
        if (!id) {
            const rawString = `${category}-${getVal(idxLoc)}`;
            let hash = 0;
            for (let i = 0; i < rawString.length; i++) {
              const char = rawString.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash |= 0;
            }
            id = `GEN-${Math.abs(hash)}`;
        }
      }

      // Visuals
      let imageUrl = getVal(idxImage);
      if (imageUrl && !imageUrl.startsWith('http')) imageUrl = '';

      // Inventory
      const qtyStr = getVal(idxQty).replace(/[^0-9-]/g, '') || '0';
      const quantity = parseInt(qtyStr, 10);
      
      const altVal = getVal(idxAlt).replace(/[^0-9-]/g, '');
      const altQuantity = altVal ? parseInt(altVal, 10) : undefined;

      // Status
      let status: InventoryItem['status'] = 'In Stock';
      if (quantity <= 0) status = 'Out of Stock';
      else if (quantity < 8) status = 'Low Stock';

      // Logistics
      const etas = etaIndices
        .map(idx => getVal(idx))
        .filter(val => val && val.length > 0 && val.toLowerCase() !== 'n/a');
      const eta = etas.join(', ');

      // Specs
      const weight = getVal(idxWeight) || undefined;
      const shippingWeight = getVal(idxShipWeight) || undefined;

      // Extras
      const location = (idxLoc > -1 ? cols[idxLoc] : '') || 'Unassigned';
      const price = parseFloat((idxPrice > -1 ? cols[idxPrice] : '0').replace(/[^0-9.]/g, '') || '0');

      // Raw Data Capture
      const raw: Record<string, string> = {};
      originalHeaders.forEach((h, i) => raw[h] = cols[i] || '');

      return {
        id,
        sku,
        partNumber,
        name,
        quantity,
        location,
        category,
        price,
        imageUrl,
        status,
        eta,
        etas: etas.length > 0 ? etas : undefined,
        altQuantity: isNaN(Number(altQuantity)) ? undefined : altQuantity,
        weight,
        shippingWeight,
        raw
      };
    }).filter(item => {
      // 1. Must have a valid ID (Technical requirement for React keys)
      if (!item.id || item.id.length === 0) return false;

      // 2. Junk Data Filter
      // Filter out item ONLY if it fails all 3:
      // - No Description (name)
      // - No Quantity (qty <= 0)
      // - Uncategorized
      const hasName = item.name && item.name.trim().length > 0;
      const hasQty = item.quantity > 0;
      const hasCategory = item.category && item.category !== 'Uncategorized';

      if (!hasName && !hasQty && !hasCategory) {
        return false;
      }

      // 3. "Fitment" Filter
      // Explicit request to hide items that are likely headers like "Audi Fitment", "BMW Fitment"
      if (item.name.toLowerCase().includes('fitment')) {
        return false;
      }

      // 4. "Highoffset" Filter
      // Explicit request to hide items/headers containing "(Highoffset)" in part number or ID
      if ((item.partNumber && item.partNumber.toLowerCase().includes('(highoffset)')) || item.id.toLowerCase().includes('(highoffset)')) {
        return false;
      }

      // 5. Header Row / Metadata Filter
      // Detects rows that are likely repeated headers from the sheet or empty spacer rows
      const lowerId = item.id.toLowerCase().trim();
      const lowerName = item.name.toLowerCase().trim();
      
      const headerKeywords = [
          'part #', 'part number', 'sku', 'part no.', 
          'item id', 'id', 'description', 'desc', 'qty', 'quantity'
      ];
      
      // If ID or Name exactly matches a header keyword, it's likely a header row
      if (headerKeywords.includes(lowerId) || headerKeywords.includes(lowerName)) {
         return false;
      }
      
      // If Name contains "description" and Quantity is 0, it's a header
      if (lowerName.includes('description') && item.quantity === 0) {
          return false;
      }

      return true;
    });

    return items;
  } catch (error) {
    console.error("Inventory fetch error:", error);
    throw error;
  }
};

export const calculateStats = (items: InventoryItem[]): InventoryStats => {
  const categories: Record<string, number> = {};
  items.forEach(item => {
    const cat = item.category || 'Uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  return {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    lowStockCount: items.filter(i => i.status === 'Low Stock').length,
    outOfStockCount: items.filter(i => i.status === 'Out of Stock').length,
    categories
  };
};