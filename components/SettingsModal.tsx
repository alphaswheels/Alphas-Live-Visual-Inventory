import React, { useState, useEffect } from 'react';
import { ColumnMapping } from '../types';
import { Database, X, Settings, Check, ExternalLink, Lock, Unlock, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sheetUrl: string, mapping: Partial<ColumnMapping>) => void;
  currentSheetUrl: string;
  currentMapping: Partial<ColumnMapping>;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, onSave, currentSheetUrl, currentMapping, isAdmin = false, onToggleAdmin
}) => {
  const [sheetUrl, setSheetUrl] = useState(currentSheetUrl);
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>(currentMapping);
  const [isLocked, setIsLocked] = useState(true);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSheetUrl(currentSheetUrl);
      setColumnMapping(currentMapping);
      setIsLocked(true);
    }
  }, [isOpen, currentSheetUrl, currentMapping]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(sheetUrl, columnMapping);
  };

  const MappingInput = ({ label, field, placeholder = "Col (e.g. A)" }: { label: string, field: keyof ColumnMapping, placeholder?: string }) => (
    <div className="flex flex-col">
       <label className="text-xs font-semibold text-slate-500 mb-1">{label}</label>
       <input 
         type="text" 
         className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono placeholder:text-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase transition-colors ${isLocked ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white'}`}
         placeholder={placeholder}
         value={columnMapping[field] || ''}
         onChange={e => setColumnMapping({...columnMapping, [field]: e.target.value.toUpperCase()})}
         maxLength={3}
         disabled={isLocked}
       />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Settings size={20} className="text-slate-400" />
                Advanced Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Map your Google Sheet columns to system fields.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
           {/* Data Source */}
           <section>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Database size={16} className="text-blue-500" /> Data Source
              </h4>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Google Sheet URL</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        className={`flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${isLocked ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        disabled={isLocked}
                    />
                     <a
                      href={sheetUrl.startsWith('http') ? sheetUrl : `https://docs.google.com/spreadsheets/d/${sheetUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded transition-colors flex items-center justify-center"
                      title="Open Sheet"
                    >
                      <ExternalLink size={18} />
                    </a>
                </div>
              </div>
           </section>

           {/* Column Mapping Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div className="space-y-6">
                   <section>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Core Identifiers</h4>
                      <div className="grid grid-cols-2 gap-3">
                          <MappingInput label="Model / Category" field="model" />
                          <MappingInput label="SKU (Primary ID)" field="sku" />
                          <MappingInput label="Part Number" field="partNumber" />
                          <MappingInput label="Product Details" field="productDetails" />
                      </div>
                   </section>

                   <section>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Visuals</h4>
                      <div className="grid grid-cols-1">
                          <MappingInput label="Product Image URL" field="productImage" />
                      </div>
                   </section>

                   <section>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Physical Specs</h4>
                      <div className="grid grid-cols-2 gap-3">
                          <MappingInput label="Weight" field="weight" />
                          <MappingInput label="Shipping Weight" field="shippingWeight" />
                      </div>
                   </section>
               </div>

               <div className="space-y-6">
                   <section>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Live Inventory</h4>
                      <div className="grid grid-cols-2 gap-3">
                          <MappingInput label="Quantity (QTY)" field="quantity" />
                          <MappingInput label="ALT Stock" field="altStock" />
                      </div>
                   </section>

                   <section>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Logistics (Sequential)</h4>
                      <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <MappingInput label="ETA 1" field="eta1" />
                            <MappingInput label="ETA 2" field="eta2" />
                            <MappingInput label="ETA 3" field="eta3" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <MappingInput label="ETA 4" field="eta4" />
                            <MappingInput label="ETA 5" field="eta5" />
                          </div>
                      </div>
                   </section>
               </div>
           </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-xl">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsLocked(!isLocked)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg transition-colors hover:bg-slate-200 flex items-center gap-2"
                title={isLocked ? "Unlock Settings" : "Lock Settings"}
            >
                {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
            {onToggleAdmin && (
                <button 
                    onClick={onToggleAdmin}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isAdmin ? 'text-white bg-slate-800 shadow-md ring-2 ring-slate-200' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                    title={isAdmin ? "Exit Admin Mode" : "Admin Access"}
                >
                    <Shield size={20} fill={isAdmin ? "currentColor" : "none"} />
                    {isAdmin && <span className="text-xs font-bold px-1">ACTIVE</span>}
                </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md flex items-center gap-2">
                <Check size={18} />
                Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;