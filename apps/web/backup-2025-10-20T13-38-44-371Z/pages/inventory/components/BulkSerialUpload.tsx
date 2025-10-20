import React, { useState, useRef } from 'react';
import { Button, Card } from '@x-ear/ui-web';
import Papa from 'papaparse';

interface BulkSerialUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (serialNumbers: string[]) => Promise<void>;
  productName?: string;
}

export const BulkSerialUpload: React.FC<BulkSerialUploadProps> = ({
  isOpen,
  onClose,
  onUpload,
  productName = ''
}) => {
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          Papa.parse(text, {
            complete: (results) => {
              const serials = results.data
                .flat()
                .filter((item: any) => item && typeof item === 'string' && item.trim())
                .map((item: any) => item.toString().trim());
              
              setSerialNumbers([...new Set(serials)]); // Remove duplicates
            },
            header: false
          });
        } else {
          // For Excel files, treat as text and parse line by line
          const serials = text
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          setSerialNumbers([...new Set(serials)]);
        }
      } catch (error) {
        console.error('File parsing error:', error);
        alert('Dosya okuma hatası. Lütfen geçerli bir CSV dosyası seçin.');
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type.includes('csv') || file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFileUpload(file);
    } else {
      alert('Lütfen CSV (.csv) veya metin (.txt) dosyası seçin.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleTextInput = (text: string) => {
    const serials = text
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    setSerialNumbers([...new Set(serials)]);
  };

  const handleSubmit = async () => {
    if (serialNumbers.length === 0) {
      alert('Lütfen en az bir seri numarası ekleyin.');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(serialNumbers);
      onClose();
      setSerialNumbers([]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Yükleme sırasında hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeSerial = (index: number) => {
    setSerialNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const csvContent = 'Seri Numarası\nSN001\nSN002\nSN003';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'seri_numarasi_sablonu.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen p-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Toplu Seri Numarası Yükleme
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {productName ? `${productName} için seri numaraları` : 'CSV/TXT dosyası ile toplu yükleme'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </Button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {/* Upload Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload */}
              <Card className="p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                  Dosya Yükleme
                </h4>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    CSV/TXT dosyasını buraya sürükleyin veya
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-4"
                  >
                    Dosya Seç
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500">
                    Desteklenen formatlar: .csv, .txt
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadTemplate}
                  className="mt-3 w-full"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  Şablon İndir
                </Button>
              </Card>

              {/* Manual Input */}
              <Card className="p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  Manuel Giriş
                </h4>
                
                <textarea
                  className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  placeholder="Seri numaralarını her satıra bir tane gelecek şekilde yazın veya virgülle ayırın&#10;&#10;Örnek:&#10;SN001&#10;SN002&#10;SN003"
                  onChange={(e) => handleTextInput(e.target.value)}
                />
                
                <p className="text-xs text-gray-500 mt-2">
                  Her satıra bir seri numarası yazın veya virgülle ayırın
                </p>
              </Card>
            </div>

            {/* Preview */}
            {serialNumbers.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                    </svg>
                    Seri Numaraları Önizleme
                  </h4>
                  <span className="text-sm text-gray-500">
                    {serialNumbers.length} adet
                  </span>
                </div>
                
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                    {serialNumbers.map((serial, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg"
                      >
                        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          {serial}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSerial(index)}
                          className="text-red-500 hover:text-red-700 ml-2 p-1 h-auto"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
              >
                İptal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isUploading || serialNumbers.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUploading ? 'Yükleniyor...' : `${serialNumbers.length} Seri Numarası Yükle`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};