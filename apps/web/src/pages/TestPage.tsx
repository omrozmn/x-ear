import { Button, Input } from '@x-ear/ui-web';
import React from 'react';
import { useFuzzySearch, useFileUpload } from '@x-ear/core';

interface TestItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

const sampleData: TestItem[] = [
  { id: '1', name: 'iPhone 14 Pro', category: 'Telefon', description: 'Apple iPhone 14 Pro 128GB' },
  { id: '2', name: 'Samsung Galaxy S23', category: 'Telefon', description: 'Samsung Galaxy S23 256GB' },
  { id: '3', name: 'MacBook Air M2', category: 'Laptop', description: 'Apple MacBook Air M2 13 inç' },
  { id: '4', name: 'Dell XPS 13', category: 'Laptop', description: 'Dell XPS 13 Intel i7' },
  { id: '5', name: 'iPad Pro', category: 'Tablet', description: 'Apple iPad Pro 11 inç' },
  { id: '6', name: 'AirPods Pro', category: 'Kulaklık', description: 'Apple AirPods Pro 2. nesil' },
  { id: '7', name: 'Sony WH-1000XM4', category: 'Kulaklık', description: 'Sony WH-1000XM4 Kablosuz Kulaklık' },
  { id: '8', name: 'Nintendo Switch', category: 'Oyun Konsolu', description: 'Nintendo Switch OLED Model' },
];

export const TestPage: React.FC = () => {
  // Fuzzy search hook'unu test et
  const { results, query, setQuery, isSearching } = useFuzzySearch(sampleData, {
    keys: ['name', 'category', 'description'],
    threshold: 0.3,
    includeScore: true,
  });

  // File upload hook'unu test et
  const { state: fileState, actions: fileActions } = useFileUpload({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['.csv', '.xlsx', '.xls'],
    parseOptions: {
      hasHeaders: true,
      delimiter: ',',
      encoding: 'utf-8'
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      fileActions.uploadFile(file);
    }
  };

  const previewData = fileActions.getPreviewData(5);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        Core Paket Test Sayfası
      </h1>
      {/* Fuzzy Search Test */}
      <div className="bg-card rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Fuzzy Search Testi
        </h2>
        
        <div className="mb-4">
          <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
            Ürün Ara
          </label>
          <Input
            id="search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="iPhone, Samsung, MacBook..."
            className="w-full px-3 py-2 border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-blue-500"
          />
        </div>

        {isSearching && (
          <div className="text-primary mb-4">Aranıyor...</div>
        )}

        <div className="space-y-3">
          {results.length > 0 ? (
            results.map((result) => (
              <div key={result.item.id} className="border border-border rounded-2xl p-4 hover:bg-muted">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">{result.item.name}</h3>
                    <p className="text-sm text-muted-foreground">{result.item.category}</p>
                    <p className="text-sm text-muted-foreground mt-1">{result.item.description}</p>
                  </div>
                  {result.score && (
                    <span className="text-xs bg-primary/10 text-blue-800 px-2 py-1 rounded">
                      Skor: {((1 - result.score) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : query ? (
            <div className="text-muted-foreground text-center py-8">
              "{query}" için sonuç bulunamadı
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              Arama yapmak için yukarıdaki kutuya yazın
            </div>
          )}
        </div>
      </div>
      {/* File Upload Test */}
      <div className="bg-card rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          File Upload Testi
        </h2>

        <div className="mb-6">
          <label htmlFor="file-upload" className="block text-sm font-medium text-foreground mb-2">
            CSV/Excel Dosyası Seç
          </label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
          />
        </div>

        {/* File State Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Dosya Durumu</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Durum:</span>{' '}
                <span className={`px-2 py-1 rounded text-xs ${
                  !fileState.file ? 'bg-muted text-foreground' :
                  fileState.isProcessing ? 'bg-warning/10 text-yellow-800' :
                  fileState.parsedData ? 'bg-success/10 text-success' :
                  'bg-destructive/10 text-red-800'
                }`}>
                  {!fileState.file ? 'Bekliyor' :
                   fileState.isProcessing ? 'İşleniyor' :
                   fileState.parsedData ? 'Başarılı' : 'Hata'}
                </span>
              </div>
              {fileState.file && (
                <>
                  <div><span className="font-medium">Dosya:</span> {fileState.file.name}</div>
                  <div><span className="font-medium">Boyut:</span> {(fileState.file.size / 1024).toFixed(1)} KB</div>
                </>
              )}
              {fileState.parsedData && (
                <>
                  <div><span className="font-medium">Satır Sayısı:</span> {fileState.parsedData.rows.length}</div>
                  <div><span className="font-medium">Sütun Sayısı:</span> {fileState.parsedData.headers.length}</div>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Sütun Tipleri</h3>
            {fileState.columnTypes && (
              <div className="space-y-1 text-sm">
                {fileState.columnTypes.map((columnInfo, index) => (
                  <div key={index}>
                    <span className="font-medium">{fileState.parsedData?.headers[index]}:</span>{' '}
                    <span className="text-primary">{columnInfo.detectedType}</span>
                    {columnInfo.confidence && (
                      <span className="text-muted-foreground ml-1">
                        ({(columnInfo.confidence * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {fileState.error && (
          <div className="bg-destructive/10 border border-red-200 rounded-xl p-4 mb-6">
            <h4 className="text-red-800 font-medium mb-2">Hata</h4>
            <p className="text-destructive text-sm">{fileState.error}</p>
          </div>
        )}

        {/* Preview Data */}
        {previewData.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">
              Veri Önizlemesi (İlk 5 satır)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-border rounded-2xl">
                <thead className="bg-muted">
                  <tr>
                    {fileState.parsedData?.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-muted">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-2 text-sm text-foreground whitespace-nowrap"
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {fileState.parsedData && (
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => fileActions.processFile()}
              disabled={fileState.isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              variant='default'>
              {fileState.isProcessing ? 'İşleniyor...' : 'Yeniden İşle'}
            </Button>
            <Button
              onClick={() => fileActions.reset()}
              className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
              variant='default'>
              Temizle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPage;