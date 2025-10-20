import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  pdfUrl?: string; // external url or data: blob url
};

export const PdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, title = 'Preview', pdfUrl }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-md shadow-lg w-[90%] max-w-4xl h-[90%] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          <div className="space-x-2">
            <button className="px-3 py-1 text-sm" onClick={onClose}>Close</button>
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Open</a>
            )}
          </div>
        </div>
        <div className="flex-1 bg-gray-100">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full" title="pdf-preview" />
          ) : (
            <div className="p-6 text-center text-gray-600">No PDF available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;