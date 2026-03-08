'use client';

import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  fileName: string;
  contentType?: string;
  onClose: () => void;
}

export function PdfViewer({ url, fileName, contentType, onClose }: PdfViewerProps) {
  const [scale, setScale] = useState(100);
  const isImage = contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(fileName);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-md">
            {fileName}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(Math.max(25, scale - 25))}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 w-12 text-center">{scale}%</span>
            <button
              onClick={() => setScale(Math.min(300, scale + 25))}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open(url, '_blank')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Open in new tab"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={url}
              download={fileName}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
          {isImage ? (
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${scale / 100})` }}
            />
          ) : (
            <iframe
              src={`${url}#toolbar=0&zoom=${scale}`}
              className="w-full h-full border-0"
              title={fileName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
