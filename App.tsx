import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import { InventoryItem, InventoryStats, ColumnMapping, SortField, SortOrder } from './types';
import { fetchInventory, calculateStats } from './services/inventoryService';
import { getOptimizedImageUrl } from './services/imageOptimizer';
import SearchControls from './components/SearchControls';
import InventoryCard from './components/InventoryCard';
import PartNumber from './components/PartNumber';
import StatsPanel from './components/StatsPanel';
import SettingsModal from './components/SettingsModal';
import ModelRibbon from './components/ModelRibbon';
import ErrorBoundary from './components/ErrorBoundary';
import ImageModal from './components/ImageModal';
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
  
  // Image Modal State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  // Scroll / Header State
  const [showHeader, setShowHeader] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

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

  // Handle scroll to hide/show header on mobile and toggle Back to Top
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Back to top visibility
    setShowBackToTop(currentScrollY > 400);

    // Calculate Scroll Direction & Delta
    const scrollDelta = currentScrollY - lastScrollY.current;

    // Buffer to prevent jitter for header (Bounce protection)
    if (Math.abs(scrollDelta) < 10) return;

    if (currentScrollY < 50) {
      // Always show near top
      setShowHeader(true);
    } else {
       // Hide if scrolling down, Show if scrolling up
       if (scrollDelta > 0) {
          setShowHeader(false);
       } else {
          setShowHeader(true);
       }
    }

    lastScrollY.current = currentScrollY;
  };

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

  // 3. Apply Search & Filtering (Result is filtered but NOT sorted yet)
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

    return result;
  }, [accessibleItems, searchQuery, multiIds, quickFilter, selectedModel]);

  // 4. Apply Sorting (Handles both Sheet Mode and Normal Mode sources)
  const sortedItems = useMemo(() => {
    // Determine the source data based on view mode
    // Sheet Mode: Bypass filters, use accessibleItems (ALL items)
    // Other Modes: Use filteredItems
    const sourceData = viewMode === 'sheet' ? accessibleItems : filteredItems;
    
    if (!sortField) return sourceData;

    return [...sourceData].sort((a, b) => {
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
  }, [accessibleItems, filteredItems, viewMode, sortField, sortOrder]);

  // 5. Pagination / Display Logic
  const displayedItems = useMemo(() => {
    // In Sheet Mode, we render everything at once to allow Ctrl+F and full visibility
    if (viewMode === 'sheet') return sortedItems;
    
    return sortedItems.slice(0, visibleCount);
  }, [sortedItems, visibleCount, viewMode]);

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
  }, [sortedItems, viewMode]);
  
  const isSearchActive = searchQuery.trim().length > 0 || multiIds.length > 0;
  const isFilterActive = quickFilter !== 'ALL' || selectedModel !== null;

  const renderImageCell = (item: InventoryItem) => {
    const thumbnail = getOptimizedImageUrl(item.imageUrl, 'thumb');
    
    return (
      <div 
        className={`w-10 h-10 rounded bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden relative group cursor-zoom-in`}
        onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}
      >
          {thumbnail ? (
              <img src={thumbnail} className="w-full h-full object-contain p-1" loading="lazy" />
          ) : (
              <ImagePlus size={16} className="text-slate-300" />
          )}
      </div>
    );
  };

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden relative font-sans text-slate-900 ${isAdmin ? 'border-t-4 border-slate-900' : ''}`}>
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 relative`}>
        
        <header 
          className={`
            bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-30 shadow-sm
            transition-transform duration-300 ease-in-out
            absolute top-0 left-0 right-0 md:relative md:translate-y-0
            ${!showHeader ? '-translate-y-full' : 'translate-y-0'}
          `}
        >
           <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors ${isAdmin ? 'bg-slate-800 shadow-slate-300' : 'bg-blue-600 shadow-blue-200'}`}>
               {isAdmin ? <Shield size={22} /> : <Package size={22} />}
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
                  Live Visual Inventory {isAdmin && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">ADMIN</span>}
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

        <main 
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 pb-4 pt-24 md:p-8 scroll-smooth"
          onScroll={handleScroll}
        >
          <div className="max-w-7xl mx-auto relative pb-32">
            
            <StatsPanel 
              stats={stats} 
              lastUpdated={lastUpdated} 
              activeFilter={quickFilter}
              onFilterSelect={handleStatFilter}
            />

            <ModelRibbon 
              models={uniqueModels}
              selectedModel={selectedModel}
              onSelectModel={(model) => {
                  setSelectedModel(model);
                  // Also clear search when a model is selected to avoid confusion
                  if (model) {
                    setSearchQuery('');
                    setMultiIds([]);
                  }
              }}
            />

            <SearchControls 
              onSearch={(q, ids) => {
                setSearchQuery(q);
                setMultiIds(ids);
                // Force reset filters if search is active to ensure we search ALL items
                if (q.trim().length > 0 || ids.length > 0) {
                    setQuickFilter('ALL');
                    setSelectedModel(null);
                }
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
                        {viewMode === 'sheet'
                          ? `Full Inventory Sheet (${accessibleItems.length})`
                          : isSearchActive 
                            ? `Search Results (${filteredItems.length})` 
                            : isFilterActive
                              ? `${quickFilter !== 'ALL' ? (quickFilter === 'LOW' ? 'Low Stock' : 'Out of Stock') : selectedModel || 'Filtered'} Items (${filteredItems.length})`
                              : `All Items (${accessibleItems.length})`
                        }
                      </h2>
                      {isFilterActive && viewMode !== 'sheet' && (
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
                      {(viewMode === 'sheet' ? accessibleItems.length > 0 : filteredItems.length > 0) && (
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

                 {(viewMode === 'sheet' ? accessibleItems.length > 0 : filteredItems.length > 0) ? (
                    <>
                        {viewMode === 'grid' ? (
                          <div key="grid-view" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayedItems.map((item) => (
                              <InventoryCard 
                                key={item.uniqueId} 
                                item={item} 
                                isAdmin={isAdmin}
                                onImageClick={(url) => setSelectedImage(url)}
                              />
                            ))}
                          </div>
                        ) : viewMode === 'list' ? (
                          <div key="list-view" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                                        {/* Location column removed */}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {displayedItems.map((item) => (
                                      <tr key={item.uniqueId} className="hover:bg-slate-50 transition-colors">
                                        <td className="pl-4 pr-2 py-3 md:px-6 md:py-4 align-top md:align-middle">
                                            <div className="font-bold text-slate-900 text-sm md:text-base mb-1 md:mb-1.5 leading-snug break-words hyphens-auto">
                                                {item.name}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:gap-2">
                                                <PartNumber id={item.id} className="text-[10px] md:text-xs px-1.5 py-0.5" iconSize={12} />
                                                
                                                {/* Mobile Status Badge */}
                                                <span className={`md:hidden px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold border tracking-tight ${
                                                    item.status === 'In Stock' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    item.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {item.status}
                                                </span>

                                                {item.partNumber && item.partNumber !== item.id && (
                                                  <span className="text-xs text-slate-400 font-mono hidden md:inline">PN:{item.partNumber}</span>
                                                )}
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden md:inline">{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 md:px-6 md:py-4 text-right align-top md:align-middle">
                                            <div className={`font-bold text-base md:text-lg leading-snug ${item.quantity < 4 ? 'text-amber-600' : 'text-slate-700'}`}>{item.quantity}</div>
                                            {/* Location removed from mobile/tablet view */}
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
                                        {/* Location cell removed */}
                                      </tr>
                                    ))}
                                  </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                            // Sheet Mode (Raw Table)
                            <div key="sheet-view" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm font-mono table-fixed md:table-auto">
                                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-xs">
                                    <tr>
                                      <th className="px-4 py-2 border-r border-slate-200/50 w-[30%] md:w-auto cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('id')}>
                                          <div className="flex items-center gap-1">Part Number {sortField === 'id' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                      </th>
                                      <th className="px-4 py-2 border-r border-slate-200/50 w-[55%] md:w-auto cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('name')}>
                                          <div className="flex items-center gap-1">Description {sortField === 'name' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                      </th>
                                      <th className="px-4 py-2 text-right w-[15%] md:w-auto cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('quantity')}>
                                          <div className="flex items-center justify-end gap-1">QTY {sortField === 'quantity' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {displayedItems.map((item, idx) => (
                                      <tr key={item.uniqueId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50 transition-colors`}>
                                        <td className="px-4 py-1.5 border-r border-slate-100 align-top">
                                            <PartNumber id={item.sku || item.id} className="text-xs bg-transparent hover:bg-blue-100 px-1 py-0.5 text-slate-700" />
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

                        {viewMode !== 'sheet' && visibleCount < sortedItems.length && (
                            <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center text-slate-400">
                               <Loader2 className="w-6 h-6 animate-spin mb-2" />
                               <span className="text-xs font-medium">Loading more items...</span>
                            </div>
                        )}
                        
                        {/* Back to Top Button for ALL Modes */}
                        {showBackToTop && (
                            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
                                <button 
                                    onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                                    className="pointer-events-auto bg-slate-900/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold hover:bg-slate-800 transition-all animate-in fade-in slide-in-from-bottom-4 hover:scale-105 active:scale-95 border border-slate-700/50"
                                >
                                    <ArrowUp size={16} className="text-blue-400" />
                                    Back to Top
                                </button>
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

      <ErrorBoundary>
        <Suspense fallback={null}>
          <AssistantPanel 
              items={viewMode === 'sheet' ? accessibleItems : filteredItems} 
              isOpen={isAssistantOpen} 
              onToggle={() => setAssistantOpen(!isAssistantOpen)} 
          />
        </Suspense>
      </ErrorBoundary>

      {/* Image Modal */}
      <ImageModal 
         imageUrl={selectedImage} 
         onClose={() => setSelectedImage(null)} 
      />

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