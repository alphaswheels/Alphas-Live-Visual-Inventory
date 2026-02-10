import React, { useState, useEffect } from 'react';
import { Filter, RefreshCw, List, Search } from 'lucide-react';

interface SearchControlsProps {
  onSearch: (query: string, multiIds: string[]) => void;
  onRefresh: () => void;
  isSyncing: boolean;
  lastUpdated: Date | null;
}

const SearchControls: React.FC<SearchControlsProps> = ({ onSearch, onRefresh, isSyncing, lastUpdated }) => {
  const [multiText, setMultiText] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 500);
    return () => clearTimeout(timer);
  }, [multiText]);

  const handleSearch = () => {
    // Split by newline, comma, space, tab
    const ids = multiText.split(/[\n,\t\s]+/).map(s => s.trim()).filter(s => s.length > 0);
    // Pass empty string for standard query, and the array for multiIds
    onSearch('', ids);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg border border-blue-500 ring-4 ring-blue-50 mb-8 relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400"></div>
      
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
               <Search size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Inventory Lookup</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-1">
             Type multiple IDs, names, or scan barcodes to search instantly.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
            {isSyncing ? 'SYNCING...' : `LIVE • ${lastUpdated?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
          </span>
          <button 
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
            title="Force Sync"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-200">
         <div className="relative">
             <textarea
              placeholder="Start typing to search..."
              className="w-full px-4 py-4 min-h-[80px] sm:min-h-[100px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 text-base placeholder:text-slate-400 resize-y shadow-inner"
              value={multiText}
              onChange={(e) => setMultiText(e.target.value)}
              onKeyDown={(e) => {
                 // Allow Enter to submit immediately
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSearch();
                 }
              }}
             />
             {multiText.length > 0 && (
                <div className="absolute bottom-3 right-3 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100 pointer-events-none">
                    {multiText.split(/[\n,\t\s]+/).filter(Boolean).length} TERM(S)
                </div>
             )}
         </div>

         <div className="flex justify-end mt-3">
            <button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-2.5 shadow-md hover:shadow-lg transition-all font-bold text-sm flex items-center gap-2 active:scale-95"
                title="Search"
            >
                <Search size={16} />
                Find Items
            </button>
         </div>
      </div>
    </div>
  );
};

export default SearchControls;