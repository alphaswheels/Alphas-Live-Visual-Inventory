import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface PartNumberProps {
  id: string;
  className?: string;
  iconSize?: number;
}

const PartNumber: React.FC<PartNumberProps> = React.memo(({ id, className = '', iconSize = 12 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`font-mono text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 group/btn max-w-full ${className}`}
      title={copied ? "Copied!" : `Copy ID: ${id}`}
    >
      <span className="truncate">{id}</span>
      {copied ? (
        <Check size={iconSize} className="text-green-600 flex-shrink-0" />
      ) : (
        <Copy size={iconSize} className="opacity-0 group-hover/btn:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </button>
  );
});

export default PartNumber;