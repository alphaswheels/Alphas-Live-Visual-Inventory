import React, { useState } from 'react';
import { analyzeInventory } from '../services/geminiService';
import { InventoryItem } from '../types';
import { Sparkles, X, Send, Bot, Loader2 } from 'lucide-react';

interface AssistantPanelProps {
  items: InventoryItem[];
  isOpen: boolean;
  onToggle: () => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ items, isOpen, onToggle }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await analyzeInventory(query, items);
      setResponse(result);
    } catch (e) {
      setResponse("Sorry, I couldn't generate an analysis at this time.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={onToggle}
        className="fixed right-6 bottom-6 bg-blue-600 text-white shadow-lg p-4 rounded-full hover:bg-blue-700 transition-all z-20 group"
        title="AI Assistant"
      >
        <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
        onClick={onToggle}
        aria-hidden="true"
      />
      
      <div className="fixed inset-y-0 right-0 w-[85vw] sm:w-96 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 border-l border-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur">
          <div className="flex items-center gap-2">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <Bot size={20} />
             </div>
             <h3 className="font-bold text-slate-800">Inventory Assistant</h3>
          </div>
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors" title="Close Assistant">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {!response && !loading && (
            <div className="text-center py-12 text-slate-400">
              <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Ask me about stock levels, location of items, or summary of current inventory.</p>
            </div>
          )}

          {query && (
             <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-sm">
                   {query}
                </div>
             </div>
          )}

          {loading && (
             <div className="flex justify-start">
                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm text-sm shadow-sm flex items-center gap-2 text-slate-500">
                   <Loader2 size={16} className="animate-spin text-blue-600" />
                   Analyzing inventory data...
                </div>
             </div>
          )}

          {response && (
             <div className="flex justify-start">
                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm text-sm shadow-sm text-slate-700 leading-relaxed prose prose-sm max-w-none">
                   {response}
                </div>
             </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              placeholder="Ask a question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button 
              onClick={handleAsk}
              disabled={loading || !query}
              className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssistantPanel;