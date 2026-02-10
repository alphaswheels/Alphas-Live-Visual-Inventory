import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import { InventoryItem, InventoryStats, ColumnMapping, SortField, SortOrder } from './types';
import { fetchInventory, calculateStats } from './services/inventoryService';
import SearchControls from './components/SearchControls';
import InventoryCard from './components/InventoryCard';
import PartNumber from './components/PartNumber';
import StatsPanel from './components/StatsPanel';
import SettingsModal from './components/SettingsModal';
import ModelRibbon from './components/ModelRibbon';
import { 
  AlertCircle, Package, LayoutGrid, List, Table,
  Database, ArrowUp, ArrowDown, FilterX, Loader2, ImagePlus, Shield
} from 'lucide-react';

// Lazy load the assistant to improve initial load time
const AssistantPanel = React.lazy(() => import('./components/AssistantPanel'));

const DEFAULT_SHEET = 'https://docs.google.com/spreadsheets/d/10VF9Yk-r9pINttngYz8MNXFk-ujPAvvOukF7Ypf4LBg/edit?usp=sharing';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data Source State
  const [activeSheetUrl, setActiveSheetUrl] = useState(DEFAULT_SHEET);

  // Admin & Visibility State
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem('isAdmin');
      return stored === 'true'; 
    } catch { 
      return false; 
    }
  });
  
  useEffect(() => { 
    localStorage.setItem('isAdmin', String(isAdmin)); 
  }, [isAdmin]);

  // Mapping State
  const [showSettings, setShowSettings] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>({
    productImage: '',
    model: '',
    sku: '',
    partNumber: '',
    productDetails: '',
    quantity: '',
    altStock: '',
    eta1: '', eta2: '', eta3: '', eta4: '', eta5: '',
    weight: '',
    shippingWeight: ''
  });

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'sheet'>('list');

  // Pagination / Virtualization state
  const [visibleCount, setVisibleCount] = useState(60);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadData = async (isBackground = false) => {
    if (isBackground) setSyncing(true);
    else setLoading(true);
    
    try {
      const data = await fetchInventory(activeSheetUrl, columnMapping);
      setItems(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      if (!isBackground) setError("Unable to load inventory data. Please check the sheet settings and ensure the URL is correct.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSaveSettings = (newUrl: string, newMapping: Partial<ColumnMapping>) => {
    setShowSettings(false);
    setColumnMapping(newMapping);
    if (newUrl !== activeSheetUrl) {
        setActiveSheetUrl(newUrl);
    } else {
        loadData();
    }
  };

  const handleSort = useCallback((field: SortField) => {
    setSortField(prevField => {
        if (prevField === field) {
            setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
            return prevField;
        } else {
            setSortOrder('asc');
            return field;
        }
    });
  }, []);

  const handleStatFilter = useCallback((filter: 'ALL' | 'LOW' | 'OUT') => {
    setQuickFilter(filter);
    setSearchQuery('');
    setMultiIds([]);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [activeSheetUrl]);

  useEffect(() => {
    setVisibleCount(60);
  }, [searchQuery, multiIds, quickFilter, selectedModel, sortField, sortOrder, isAdmin, viewMode]);

  // --- Data Processing Pipeline ---

  // 1. Data passed through (Supabase overrides removed)
  const accessibleItems = items;

  // 2. Compute Derived Data
  const uniqueModels = useMemo(() => {
    const models = new Set(accessibleItems.map(i => i.category).filter(c => c && c !== 'Uncategorized'));
    return Array.from(models).sort();
  }, [accessibleItems]);

  const stats: InventoryStats = useMemo(() => calculateStats(accessibleItems), [accessibleItems]);

  // 3. Apply Search & Filtering
  const filteredItems = useMemo(() => {
    let result = accessibleItems;
    
    const hasMultiSearch = multiIds.length > 0;
    const hasQuerySearch = searchQuery.trim().length > 0;
    const isSearchActive = hasMultiSearch || hasQuerySearch;

    if (isSearchActive) {
      if (hasMultiSearch) {
        result = result.filter(item => 
          multiIds.some(term => {
            const lowerTerm = term.toLowerCase();
            return (
              item.id.toLowerCase().includes(lowerTerm) ||
              item.sku?.toLowerCase().includes(lowerTerm) ||
              item.partNumber?.toLowerCase().includes(lowerTerm) ||
              item.name.toLowerCase().includes(lowerTerm) ||
              item.category.toLowerCase().includes(lowerTerm)
            );
          })
        );
      } 
      else if (hasQuerySearch) {
        const lowerQ = searchQuery.toLowerCase();
        result = result.filter(item => 
          item.id.toLowerCase().includes(lowerQ) ||
          item.sku?.toLowerCase().includes(lowerQ) ||
          item.partNumber?.toLowerCase().includes(lowerQ) ||
          item.name.toLowerCase().includes(lowerQ) ||
          item.category.toLowerCase().includes(lowerQ)
        );
      }
    } else {
      if (quickFilter === 'LOW') {
        result = result.filter(item => item.status === 'Low Stock');
      } else if (quickFilter === 'OUT') {
        result = result.filter(item => item.status === 'Out of Stock');
      }

      if (selectedModel) {
        result = result.filter(item => item.category === selectedModel);
      }
    }

    // Sort logic - Skip sorting in Sheet Mode to preserve original sheet order
    if (sortField && viewMode !== 'sheet') {
      result = [...result].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA === undefined) return 1;
        if (valB === undefined) return -1;

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [accessibleItems, searchQuery, multiIds, sortField, sortOrder, quickFilter, selectedModel, viewMode]);

  const displayedItems = useMemo(() => {
    // In Sheet Mode, we render everything at once to allow Ctrl+F and full visibility
    if (viewMode === 'sheet') return filteredItems;
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount, viewMode]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 60);
        }
      },
      { root: null, rootMargin: '500px', threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [filteredItems, viewMode]);
  
  const isSearchActive = searchQuery.trim().length > 0 || multiIds.length > 0;
  const isFilterActive = quickFilter !== 'ALL' || selectedModel !== null;

  const renderImageCell = (item: InventoryItem) => {
    return (
      <div className={`w-10 h-10 rounded bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden relative group`}>
          {item.imageUrl ? (
              <img src={item.imageUrl} className="w-full h-full object-contain p-1" />
          ) : (
              <ImagePlus size={16} className="text-slate-300" />
          )}
      </div>
    );
  };

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden relative font-sans text-slate-900 ${isAdmin ? 'border-t-4 border-slate-900' : ''}`}>
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300`}>
        
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 sticky top-0">
           <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors ${isAdmin ? 'bg-slate-800 shadow-slate-300' : 'bg-blue-600 shadow-blue-200'}`}>
               {isAdmin ? <Shield size={22} /> : <Package size={22} />}
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
                  VisualInventory {isAdmin && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">ADMIN</span>}
                </h1>
                <span className="text-xs text-slate-500 font-medium">Real-time Dashboard</span>
             </div>
           </div>
           
           <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
           >
              <Database size={16} />
              <span className="hidden sm:inline">Configuration</span>
           </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-32">
          <div className="max-w-7xl mx-auto">
            
            <StatsPanel 
              stats={stats} 
              lastUpdated={lastUpdated} 
              activeFilter={quickFilter}
              onFilterSelect={handleStatFilter}
            />

            <ModelRibbon 
              models={uniqueModels}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />

            <SearchControls 
              onSearch={(q, ids) => {
                setSearchQuery(q);
                setMultiIds(ids);
              }}
              onRefresh={() => loadData(true)}
              isSyncing={syncing}
              lastUpdated={lastUpdated}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {loading && items.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-medium text-sm">Loading Inventory...</p>
               </div>
            ) : (
              <>
                 <div className="flex justify-between items-end mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {isSearchActive 
                          ? `Search Results (${filteredItems.length})` 
                          : isFilterActive
                            ? `${quickFilter !== 'ALL' ? (quickFilter === 'LOW' ? 'Low Stock' : 'Out of Stock') : selectedModel || 'Filtered'} Items (${filteredItems.length})`
                            : `All Items (${accessibleItems.length})`
                        }
                      </h2>
                      {isFilterActive && (
                         <button 
                            onClick={() => {
                              handleStatFilter('ALL');
                              setSelectedModel(null);
                            }}
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                         >
                            <FilterX size={12} />
                            Reset All
                         </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {filteredItems.length > 0 && (
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Grid View"
                          >
                            <LayoutGrid size={16} />
                          </button>
                          <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="List View"
                          >
                            <List size={16} />
                          </button>
                          <button 
                            onClick={() => setViewMode('sheet')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'sheet' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Sheet Mode (Raw)"
                          >
                            <Table size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                 </div>

                 {filteredItems.length > 0 ? (
                    <>
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayedItems.map((item) => (
                              <InventoryCard 
                                key={item.id} 
                                item={item} 
                                isAdmin={isAdmin}
                              />
                            ))}
                          </div>
                        ) : viewMode === 'list' ? (
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm table-fixed md:table-auto">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                    <tr>
                                        <th className="pl-4 pr-2 py-3 md:px-6 md:py-4 cursor-pointer hover:bg-slate-100 transition-colors w-[75%] md:w-auto" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">Description {sortField === 'name' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                        </th>
                                        <th className="px-2 py-3 md:px-6 md:py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors w-[25%] md:w-auto" onClick={() => handleSort('quantity')}>
                                            <div className="flex items-center justify-end gap-1">QTY {sortField === 'quantity' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                        </th>
                                        <th className="hidden md:table-cell px-6 py-4 w-24">Image</th>
                                        <th className="hidden md:table-cell px-6 py-4 text-center w-32">Status</th>
                                        <th className="hidden lg:table-cell px-6 py-4 w-32">Location</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {displayedItems.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="pl-4 pr-2 py-3 md:px-6 md:py-4 align-top md:align-middle">
                                            <div className="font-bold text-slate-900 text-sm md:text-base mb-1 md:mb-1.5 leading-snug break-words hyphens-auto">
                                                {item.name}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:gap-2">
                                                <PartNumber id={item.id} className="text-[10px] md:text-xs px-1.5 py-0.5" iconSize={12} />
                                                
                                                {/* Mobile Status Badge */}
                                                <span className={`md:hidden px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border tracking-tight ${
                                                    item.status === 'In Stock' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    item.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {item.status === 'Out of Stock' ? 'OUT' : item.status === 'Low Stock' ? 'LOW' : 'IN'}
                                                </span>

                                                {item.partNumber && item.partNumber !== item.id && (
                                                  <span className="text-xs text-slate-400 font-mono hidden md:inline">PN:{item.partNumber}</span>
                                                )}
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden md:inline">{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 md:px-6 md:py-4 text-right align-top md:align-middle">
                                            <div className={`font-bold text-base md:text-lg leading-snug ${item.quantity < 4 ? 'text-amber-600' : 'text-slate-700'}`}>{item.quantity}</div>
                                            {/* Mobile Location Under Quantity */}
                                            <div className="md:hidden mt-1 flex justify-end">
                                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 break-all text-right max-w-full">
                                                    {item.location || "N/A"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4">
                                            {renderImageCell(item)}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                                                item.status === 'In Stock' ? 'bg-green-50 text-green-700 border-green-200' :
                                                item.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-4 text-slate-600 font-mono text-sm whitespace-nowrap">{item.location}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                            // Sheet Mode (Raw Table)
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm font-mono table-fixed md:table-auto">
                                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-xs">
                                    <tr>
                                      <th className="px-4 py-2 border-r border-slate-200/50 w-[30%] md:w-auto">Part Number</th>
                                      <th className="px-4 py-2 border-r border-slate-200/50 w-[55%] md:w-auto">Description</th>
                                      <th className="px-4 py-2 text-right w-[15%] md:w-auto">QTY</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {displayedItems.map((item, idx) => (
                                      <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50 transition-colors`}>
                                        <td className="px-4 py-1.5 font-bold text-slate-700 break-all md:whitespace-nowrap border-r border-slate-100 align-top">
                                            {item.sku || item.id}
                                        </td>
                                        <td className="px-4 py-1.5 text-slate-600 break-words border-r border-slate-100 align-top" title={item.name}>
                                            {item.name}
                                        </td>
                                        <td className={`px-4 py-1.5 text-right font-bold align-top ${item.quantity < 4 ? 'text-red-600' : 'text-slate-800'}`}>
                                            {item.quantity}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                        )}

                        {viewMode !== 'sheet' && visibleCount < filteredItems.length && (
                            <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center text-slate-400">
                               <Loader2 className="w-6 h-6 animate-spin mb-2" />
                               <span className="text-xs font-medium">Loading more items...</span>
                            </div>
                        )}
                    </>
                 ) : (
                   <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Package size={24} className="text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">No items found</h3>
                      <p className="text-slate-500 mt-1">Try adjusting your search terms or filters.</p>
                   </div>
                 )}
              </>
            )}
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <AssistantPanel 
            items={filteredItems} 
            isOpen={isAssistantOpen} 
            onToggle={() => setAssistantOpen(!isAssistantOpen)} 
        />
      </Suspense>

      <SettingsModal 
         isOpen={showSettings}
         onClose={() => setShowSettings(false)}
         onSave={handleSaveSettings}
         currentSheetUrl={activeSheetUrl}
         currentMapping={columnMapping}
         isAdmin={isAdmin}
         onToggleAdmin={() => setIsAdmin(!isAdmin)}
      />
    </div>
  );
};

export default App;