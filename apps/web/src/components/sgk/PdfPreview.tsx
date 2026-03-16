import React, { useState, useEffect, useRef } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@x-ear/ui-web';

interface PdfPreviewProps {
  file: File;
  className?: string;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ file, className = '' }) => {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (file.type !== 'application/pdf') {
      setIsSupported(false);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!isSupported || !objectUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">{file.name}</p>
        <p className="text-xs text-gray-400 mt-1">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-gray-50 rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <span className="text-xs text-gray-600 truncate max-w-[200px]">{file.name}</span>
        <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
      </div>

      <iframe
        ref={iframeRef}
        src={`${objectUrl}#toolbar=0&navpanes=0`}
        className="w-full h-64 border-none"
        title={`PDF preview: ${file.name}`}
      />
    </div>
  );
};

export default PdfPreview;
