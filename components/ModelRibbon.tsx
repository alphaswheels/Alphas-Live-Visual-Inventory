import React, { useRef } from 'react';
import { Layers, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ModelRibbonProps {
  models: string[];
  selectedModel: string | null;
  onSelectModel: (model: string | null) => void;
}

const ModelRibbon: React.FC<ModelRibbonProps> = ({ models, selectedModel, onSelectModel }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (models.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: direction === 'right' ? currentScroll + scrollAmount : currentScroll - scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={12} /> 
          Model Filter
          <span className="bg-slate-100 text-slate-500 px-1.5 rounded-full text-[10px] font-mono">{models.length}</span>
        </h3>
        {selectedModel && (
           <button 
             onClick={() => onSelectModel(null)}
             className="text-[10px] font-medium text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors bg-red-50 px-2 py-0.5 rounded-full"
           >
             <X size={10} /> Clear Filter
           </button>
        )}
      </div>
      
      <div className="relative flex items-center gap-2 group">
        {/* Left Scroll Button - Unified Layout */}
        <button 
          onClick={() => scroll('left')}
          className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm flex-shrink-0 z-10 hover:text-blue-600 hover:border-blue-400 transition-all"
          title="Scroll Left"
        >
          <ChevronLeft size={16} />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex-1 flex gap-2 overflow-x-auto pb-3 pt-1 scrollbar-hide px-1 snap-x w-full scroll-smooth min-w-0"
        >
          <button
            onClick={() => onSelectModel(null)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-all border snap-start select-none
              ${selectedModel === null 
                ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              }
            `}
          >
            ALL MODELS
          </button>
          {models.map(model => (
            <button
              key={model}
              onClick={() => onSelectModel(selectedModel === model ? null : model)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border snap-start select-none whitespace-nowrap
                ${selectedModel === model 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105 ring-2 ring-blue-100' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm'
                }
              `}
            >
              {model}
            </button>
          ))}
        </div>

        {/* Right Scroll Button - Unified Layout */}
        <button 
          onClick={() => scroll('right')}
          className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm flex-shrink-0 z-10 hover:text-blue-600 hover:border-blue-400 transition-all"
          title="Scroll Right"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default ModelRibbon;