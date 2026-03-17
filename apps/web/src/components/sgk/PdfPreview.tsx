import React, { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

interface PdfPreviewProps {
  file: File;
  className?: string;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ file, className = '' }) => {
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
      <div className={`flex flex-col items-center justify-center p-6 bg-muted rounded-2xl ${className}`}>
        <FileText className="w-12 h-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-muted rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-2 bg-muted border-b">
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{file.name}</span>
        <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
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
