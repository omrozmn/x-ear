import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button, useToastHelpers } from '@x-ear/ui-web';
import { MARKETPLACE_CONFIGS } from '../config/marketplaceFields';
import {
  useListMarketplaceListings, useCreateMarketplaceListing,
  useUpdateMarketplaceListing, useDeleteMarketplaceListing,
  useAIAutoFillListings, type MarketplaceListing, type AIFillResponse
} from '@/api/client/marketplace-listings.client';
import { MarketplaceListingModal } from './MarketplaceListingModal';
import { AIAutoFillPreviewModal } from './AIAutoFillPreviewModal';

interface ECommerceTabProps {
  inventoryId: string;
  integrations: Array<{ id: string; platform: string; name: string; status: string; isActive: boolean }>;
}

export const ECommerceTab: React.FC<ECommerceTabProps> = ({ inventoryId, integrations }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [isAIPreviewOpen, setIsAIPreviewOpen] = useState(false);
  const [aiResults, setAiResults] = useState<AIFillResponse[]>([]);
  const toast = useToastHelpers();

  const { data: listingsData, refetch } = useListMarketplaceListings(inventoryId);
  const createListing = useCreateMarketplaceListing(inventoryId);
  const updateListing = useUpdateMarketplaceListing(inventoryId);
  const deleteListing = useDeleteMarketplaceListing(inventoryId);
  const aiAutoFill = useAIAutoFillListings(inventoryId);

  const listings = listingsData?.data || [];
  const activeIntegrations = integrations.filter(i => i.isActive && i.status === 'connected');

  const getListingForIntegration = (integrationId: string): MarketplaceListing | undefined =>
    listings.find(l => l.integrationId === integrationId);

  const handleAIFillAll = async () => {
    setIsAIPreviewOpen(true);
    try {
      const result = await aiAutoFill.mutateAsync();
      setAiResults(result?.data || []);
    } catch {
      toast.error('AI doldurma başarısız');
      setIsAIPreviewOpen(false);
    }
  };

  const handleAIFillSingle = async (platform: string) => {
    try {
      const result = await aiAutoFill.mutateAsync(platform);
      return result?.data?.[0];
    } catch {
      toast.error('AI doldurma başarısız');
      return undefined;
    }
  };

  const handleAcceptAIResults = async (results: AIFillResponse[]) => {
    for (const result of results) {
      const integration = integrations.find(i => i.platform === result.platform);
      if (!integration) continue;

      const existingListing = getListingForIntegration(integration.id);
      if (existingListing) {
        await updateListing.mutateAsync({
          listingId: existingListing.id,
          data: {
            marketplaceTitle: result.marketplaceTitle,
            marketplaceDescription: result.marketplaceDescription,
            marketplacePrice: result.marketplacePrice,
            listingData: result.listingData,
          },
        });
      } else {
        await createListing.mutateAsync({
          integrationId: integration.id,
          marketplaceTitle: result.marketplaceTitle,
          marketplaceDescription: result.marketplaceDescription,
          marketplacePrice: result.marketplacePrice,
        });
      }
    }
    refetch();
    toast.success('AI içerikleri uygulandı');
  };

  const handleSaveListing = async (data: Record<string, unknown>) => {
    if (!selectedIntegrationId) return;
    const existingListing = getListingForIntegration(selectedIntegrationId);
    if (existingListing) {
      await updateListing.mutateAsync({ listingId: existingListing.id, data: data as Parameters<typeof updateListing.mutateAsync>[0]['data'] });
    } else {
      await createListing.mutateAsync(data as Parameters<typeof createListing.mutateAsync>[0]);
    }
    refetch();
  };

  if (activeIntegrations.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-1">Pazaryeri Entegrasyonu Bulunamadı</h3>
        <p className="text-sm text-muted-foreground mb-4">
          E-ticaret özelliğini kullanmak için önce Ayarlar &gt; Entegrasyon sayfasından pazaryeri bağlantısı kurun.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
          <AlertCircle className="w-4 h-4" />
          Aktif pazaryeri entegrasyonu gerekli
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Fill All button */}
      <div className="flex justify-end">
        <Button
          onClick={handleAIFillAll}
          disabled={aiAutoFill.isPending}
          icon={aiAutoFill.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        >
          AI ile Tümünü Doldur
        </Button>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeIntegrations.map(integration => {
          const config = MARKETPLACE_CONFIGS[integration.platform];
          const listing = getListingForIntegration(integration.id);

          return (
            <div
              key={integration.id}
              onClick={() => {
                setSelectedPlatform(integration.platform);
                setSelectedIntegrationId(integration.id);
              }}
              className="p-4 rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={config?.logo || ''}
                  alt={config?.name || integration.platform}
                  className="w-8 h-8"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <h4 className="font-medium text-foreground">{config?.name || integration.platform}</h4>
                  <p className="text-xs text-muted-foreground">{integration.name}</p>
                </div>
              </div>

              {listing ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      listing.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      listing.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {listing.status === 'published' ? 'Yayında' : listing.status === 'error' ? 'Hata' : 'Taslak'}
                    </span>
                    {listing.marketplacePrice && (
                      <span className="text-sm font-medium">{listing.marketplacePrice.toLocaleString()} TL</span>
                    )}
                  </div>
                  {listing.marketplaceTitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{listing.marketplaceTitle}</p>
                  )}
                  {listing.errorMessage && (
                    <p className="text-xs text-red-500 line-clamp-1">{listing.errorMessage}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Henüz listelenmedi — tıklayarak oluşturun
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Listing Modal */}
      {selectedPlatform && selectedIntegrationId && (
        <MarketplaceListingModal
          isOpen={!!selectedPlatform}
          onClose={() => { setSelectedPlatform(null); setSelectedIntegrationId(null); }}
          platform={selectedPlatform}
          integrationId={selectedIntegrationId}
          existingListing={getListingForIntegration(selectedIntegrationId)}
          inventoryId={inventoryId}
          onSave={handleSaveListing}
          onAIFill={handleAIFillSingle}
        />
      )}

      {/* AI Auto-Fill Preview Modal */}
      <AIAutoFillPreviewModal
        isOpen={isAIPreviewOpen}
        onClose={() => setIsAIPreviewOpen(false)}
        results={aiResults}
        isLoading={aiAutoFill.isPending}
        onAccept={handleAcceptAIResults}
      />
    </div>
  );
};
