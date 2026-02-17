import React from 'react';
import { InventoryItem } from '../types';
import { MapPin, ImageOff, Layers, Calendar } from 'lucide-react';
import PartNumber from './PartNumber';
import { getOptimizedImageUrl } from '../services/imageOptimizer';

interface InventoryCardProps {
  item: InventoryItem;
  isAdmin?: boolean;
  onImageClick: (url: string) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = React.memo(({ 
  item, 
  isAdmin = false,
  onImageClick
}) => {
  const statusColors = {
    'In Stock': 'bg-green-100 text-green-700 border-green-200',
    'Low Stock': 'bg-amber-100 text-amber-700 border-amber-200',
    'Out of Stock': 'bg-red-100 text-red-700 border-red-200',
  }[item.status];

  const containerClass = 'bg-white border-slate-200';

  // Get the optimized thumbnail URL (approx 200-250px)
  const thumbnail = getOptimizedImageUrl(item.imageUrl, 'thumb');

  return (
    <div className={`${containerClass} rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full group relative border`}>
      
      <div className="p-4 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-2">
             <PartNumber id={item.id} className="mb-1" />
             <h3 className="font-medium text-slate-800 text-sm leading-snug line-clamp-2" title={item.name}>
               {item.name}
             </h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusColors} whitespace-nowrap flex-shrink-0`}>
            {item.status}
          </span>
        </div>

        {/* Image & Main Info */}
        <div className="flex gap-4 mb-4">
           {/* Image Container */}
           <div 
             className="w-20 h-20 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden group/image cursor-pointer"
             onClick={() => item.imageUrl && onImageClick(item.imageUrl)}
           >
             {thumbnail ? (
               <img 
                  src={thumbnail} 
                  alt={item.name} 
                  loading="lazy"
                  className="w-full h-full object-contain mix-blend-multiply p-1" 
               />
             ) : (
               <ImageOff size={20} className="text-slate-300" />
             )}
           </div>
           
           <div className="flex flex-col justify-center">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Quantity</span>
              <div className="flex items-baseline gap-1">
                 <span className={`text-3xl font-bold tracking-tight ${item.quantity === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                   {item.quantity}
                 </span>
                 <span className="text-xs text-slate-500 font-medium">units</span>
              </div>
              {item.altQuantity && item.altQuantity > 0 && (
                 <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium mt-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit">
                    <Layers size={10} />
                    <span>Alt: {item.altQuantity}</span>
                 </div>
              )}
           </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
           <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                 <MapPin size={10} /> Location
              </span>
              <div className="text-sm font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block max-w-full truncate">
                 {item.location || "N/A"}
              </div>
           </div>
           
           <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                 {/* Replaced Scale with simple text to avoid import issues if any, but Scale is standard */}
                 Weight
              </span>
              <div className="text-sm font-medium text-slate-600">
                 {item.weight || "-"}
              </div>
           </div>
        </div>
        
        {/* Logistics / ETA */}
        {(item.etas?.length || item.eta) && (
            <div className="mt-3 pt-2 border-t border-slate-100">
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar size={10} /> Incoming
               </span>
               <div className="flex flex-wrap gap-1">
                  {item.etas && item.etas.length > 0 ? (
                    item.etas.map((eta, idx) => (
                       <span key={idx} className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                         {eta}
                       </span>
                    ))
                  ) : (
                     <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {item.eta}
                     </span>
                  )}
               </div>
            </div>
        )}

      </div>
      
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
         <span>{item.category}</span>
      </div>
    </div>
  );
});

export default InventoryCard;