import React from 'react';
import { InventoryStats } from '../types';
import { Archive, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';

interface StatsPanelProps {
  stats: InventoryStats;
  lastUpdated: Date | null;
  activeFilter: 'ALL' | 'LOW' | 'OUT';
  onFilterSelect: (filter: 'ALL' | 'LOW' | 'OUT') => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, lastUpdated, activeFilter, onFilterSelect }) => {
  const getCardClass = (type: 'ALL' | 'LOW' | 'OUT') => {
    const base = "bg-white p-3 rounded-xl shadow-sm border transition-all cursor-pointer flex items-center justify-between min-w-[140px] md:min-w-0 snap-start flex-shrink-0";
    const isActive = activeFilter === type;
    
    if (isActive) {
      // Reduced highlight: Removed high-contrast ring, used softer border and background
      return `${base} border-blue-300 bg-blue-50`;
    }
    return `${base} border-slate-200 hover:border-blue-300 active:scale-95`;
  };

  return (
    // Mobile: Horizontal Scroll (High Density)
    // Desktop: 4-Column Grid
    // -mx-4 px-4 allows the scroll area to touch screen edges on mobile while respecting parent padding on content
    <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-hide snap-x -mx-4 px-4 md:grid md:grid-cols-4 md:gap-4 md:mx-0 md:px-0 md:pb-0 md:mb-6">
      
      <div className={getCardClass('ALL')} onClick={() => onFilterSelect('ALL')}>
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Items</p>
          <p className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mt-0.5">{stats.totalItems.toLocaleString()}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Archive size={18} />
        </div>
      </div>

      <div className={getCardClass('LOW')} onClick={() => onFilterSelect('LOW')}>
        <div>
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Low Stock</p>
          <p className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mt-0.5">{stats.lowStockCount.toLocaleString()}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertTriangle size={18} />
        </div>
      </div>

      <div className={getCardClass('OUT')} onClick={() => onFilterSelect('OUT')}>
        <div>
          <p className="text-red-600 text-[10px] font-bold uppercase tracking-wider">Out of Stock</p>
          <p className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mt-0.5">{stats.outOfStockCount.toLocaleString()}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
          <AlertOctagon size={18} />
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between min-w-[140px] md:min-w-0 snap-start flex-shrink-0">
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Last Sync</p>
          <p className="text-lg md:text-xl font-bold text-slate-800 leading-tight mt-0.5">
             {lastUpdated ? lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
          </p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
          <Clock size={18} />
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;