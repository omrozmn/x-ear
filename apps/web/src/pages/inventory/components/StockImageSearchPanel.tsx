import React, { useState } from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { Button, Input, Modal, useToastHelpers } from '@x-ear/ui-web';
import { useSearchStockImages, useDownloadStockImage } from '@/api/client/stock-images.client';

interface StockImageSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: string;
  onImageAdded: () => void;
}

export const StockImageSearchPanel: React.FC<StockImageSearchPanelProps> = ({
  isOpen, onClose, inventoryId, onImageAdded
}) => {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [provider, setProvider] = useState<'pexels' | 'unsplash'>('pexels');
  const [page, setPage] = useState(1);
  const toast = useToastHelpers();

  const { data, isLoading } = useSearchStockImages({
    query: searchQuery,
    provider,
    page,
    per_page: 20,
  });

  const downloadMutation = useDownloadStockImage();

  const results = data?.data?.results || [];
  const total = data?.data?.total || 0;

  const handleSearch = () => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleDownload = async (imageId: string, imageUrl: string) => {
    try {
      await downloadMutation.mutateAsync({
        data: {
          provider,
          imageId,
          imageUrl,
          inventoryId,
        },
      });
      toast.success('Görsel eklendi');
      onImageAdded();
    } catch {
      toast.error('Görsel eklenemedi');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stok Görsel Ara" size="xl">
      <div className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Görsel ara..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} icon={<Search className="w-4 h-4" />}>
            Ara
          </Button>
        </div>

        {/* Provider toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setProvider('pexels'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${provider === 'pexels' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'}`}
          >
            Pexels
          </button>
          <button
            onClick={() => { setProvider('unsplash'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${provider === 'unsplash' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'}`}
          >
            Unsplash
          </button>
          {total > 0 && (
            <span className="text-sm text-muted-foreground self-center ml-auto">{total.toLocaleString()} sonuç</span>
          )}
        </div>

        {/* Results grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
              {results.map((img: any) => (
                <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={img.thumbnailUrl}
                    alt={img.description || 'Stock image'}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      onClick={() => handleDownload(img.id, img.url)}
                      disabled={downloadMutation.isPending}
                      icon={downloadMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    >
                      Ekle
                    </Button>
                  </div>
                  {img.photographer && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                      {img.photographer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Önceki
              </Button>
              <span className="text-sm text-muted-foreground self-center">Sayfa {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={results.length < 20}
              >
                Sonraki
              </Button>
            </div>
          </>
        ) : searchQuery ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Sonuç bulunamadı</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
