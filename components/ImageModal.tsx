import React, { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink, ImageOff } from 'lucide-react';
import { getOptimizedImageUrl } from '../services/imageOptimizer';

interface ImageModalProps {
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, altText, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    if (imageUrl) {
      setMounted(true);
      setLoading(true);
      setError(false);
    } else {
      setMounted(false);
    }
  }, [imageUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!imageUrl) return null;

  const fullSizeUrl = getOptimizedImageUrl(imageUrl, 'full');

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/90 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center transition-all duration-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-blue-400 transition-colors p-2"
          aria-label="Close image"
        >
          <X size={32} />
        </button>

        <div className="bg-transparent rounded-lg overflow-hidden shadow-2xl relative flex items-center justify-center min-w-[200px] min-h-[200px]">
          
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 z-10">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="text-sm font-medium tracking-wide">Loading High-Res...</p>
            </div>
          )}

          {error ? (
             <div className="bg-slate-800 p-12 rounded-xl text-center text-slate-400 flex flex-col items-center">
                <ImageOff size={48} className="mb-4" />
                <p>Failed to load image.</p>
             </div>
          ) : (
             <img 
                src={fullSizeUrl} 
                alt={altText || 'Product Preview'} 
                className={`max-w-full max-h-[85vh] object-contain rounded-md shadow-lg transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
             />
          )}
        </div>

        {/* Footer info */}
        {!loading && !error && (
            <div className="mt-4 flex gap-4">
                <a 
                href={fullSizeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md transition-colors"
                >
                <ExternalLink size={14} />
                Open Original
                </a>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageModal;