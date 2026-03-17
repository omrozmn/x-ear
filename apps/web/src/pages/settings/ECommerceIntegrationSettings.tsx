import React, { useState } from 'react';
import { ShoppingBag, Truck, Plus } from 'lucide-react';
import { Button, useToastHelpers } from '@x-ear/ui-web';
import { MARKETPLACE_CONFIGS, CARGO_PROVIDERS } from '../inventory/config/marketplaceFields';
import { MarketplaceCredentialModal } from './MarketplaceCredentialModal';
import { CargoCredentialModal } from './CargoCredentialModal';
import {
  useListCargoIntegrations, useCreateCargoIntegration,
  useUpdateCargoIntegration, useTestCargoIntegration,
  type CargoIntegration
} from '@/api/client/cargo-integrations.client';
import { useListAdminMarketplaceIntegrations } from '@/api/generated';
import { customInstance } from '@/api/orval-mutator';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';

export const ECommerceIntegrationSettings: React.FC = () => {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<string | null>(null);
  const toast = useToastHelpers();

  // Marketplace integrations
  const { data: mktData, refetch: refetchMkt } = useListAdminMarketplaceIntegrations();
  const marketplaceIntegrations = (mktData as { data?: Array<Record<string, unknown>> })?.data || [];

  // Cargo integrations
  const { data: cargoData, refetch: refetchCargo } = useListCargoIntegrations();
  const cargoIntegrations = (cargoData?.data || []) as CargoIntegration[];

  const createCargo = useCreateCargoIntegration();
  const updateCargo = useUpdateCargoIntegration();
  const testCargo = useTestCargoIntegration();

  const getMktIntegration = (platform: string) =>
    marketplaceIntegrations.find((i: Record<string, unknown>) => i.platform === platform);

  const getCargoIntegration = (platform: string) =>
    cargoIntegrations.find(i => i.platform === platform);

  const handleSaveMarketplace = async (data: {
    platform: string; name: string; apiKey: string; apiSecret: string;
    sellerId: string; syncStock: boolean; syncPrices: boolean; syncOrders: boolean;
  }) => {
    const existing = getMktIntegration(data.platform);
    if (existing) {
      await customInstance({
        url: `/api/admin/marketplaces/integrations/${(existing as Record<string, unknown>).id}`,
        method: 'PUT',
        data: {
          name: data.name,
          apiKey: data.apiKey,
          apiSecret: data.apiSecret,
          sellerId: data.sellerId,
          syncStock: data.syncStock,
          syncPrices: data.syncPrices,
          syncOrders: data.syncOrders,
        },
      });
    } else {
      await customInstance({
        url: '/api/admin/marketplaces/integrations',
        method: 'POST',
        data: {
          platform: data.platform,
          name: data.name,
          apiKey: data.apiKey,
          apiSecret: data.apiSecret,
          sellerId: data.sellerId,
          syncStock: data.syncStock,
          syncPrices: data.syncPrices,
          syncOrders: data.syncOrders,
        },
      });
    }
    refetchMkt();
  };

  const handleDisconnectMarketplace = async (integrationId: string) => {
    await customInstance({
      url: `/api/admin/marketplaces/integrations/${integrationId}`,
      method: 'DELETE',
    });
    refetchMkt();
    setSelectedMarketplace(null);
    toast.success('Bağlantı kesildi');
  };

  const handleSaveCargo = async (data: { platform: string; name: string; apiKey: string; apiSecret: string; customerId: string }) => {
    const existing = getCargoIntegration(data.platform);
    if (existing) {
      await updateCargo.mutateAsync({
        id: existing.id,
        data: { apiKey: data.apiKey, apiSecret: data.apiSecret, customerId: data.customerId },
      });
    } else {
      await createCargo.mutateAsync({
        platform: data.platform,
        name: data.name,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        customerId: data.customerId,
      });
    }
    refetchCargo();
  };

  const handleTestCargo = async (id: string) => {
    await testCargo.mutateAsync(id);
    refetchCargo();
  };

  return (
    <div className="space-y-8">
      {/* Marketplace Integrations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        <SettingsSectionHeader
          className="mb-6"
          title="Pazaryeri Entegrasyonları"
          description="Ürünlerinizi pazaryerlerinde satışa sunmak için API bağlantısı kurun."
          icon={<ShoppingBag className="w-6 h-6" />}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(MARKETPLACE_CONFIGS).map(([key, config]) => {
            const integration = getMktIntegration(key);
            const isConnected = integration && (integration as Record<string, unknown>).status === 'connected';

            return (
              <button
                key={key}
                onClick={() => setSelectedMarketplace(key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  isConnected
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <img
                  src={config.logo}
                  alt={config.name}
                  className="w-10 h-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <span className="hidden text-2xl"><ShoppingBag className="w-6 h-6" /></span>
                <span className="text-sm font-medium text-foreground">{config.name}</span>
                {isConnected && (
                  <span className="text-[10px] text-green-600 font-medium">Bağlı</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cargo Integrations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        <SettingsSectionHeader
          className="mb-6"
          title="Kargo Entegrasyonları"
          description="Kargo firmalarıyla API bağlantısı kurarak otomatik gönderi oluşturun."
          icon={<Truck className="w-6 h-6" />}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CARGO_PROVIDERS.map(provider => {
            const integration = getCargoIntegration(provider.id);
            const isConnected = integration?.status === 'connected';

            return (
              <button
                key={provider.id}
                onClick={() => setSelectedCargo(provider.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  isConnected
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className="w-10 h-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm font-medium text-foreground">{provider.name}</span>
                {isConnected && (
                  <span className="text-[10px] text-green-600 font-medium">Bağlı</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Marketplace Credential Modal */}
      {selectedMarketplace && (
        <MarketplaceCredentialModal
          isOpen={!!selectedMarketplace}
          onClose={() => setSelectedMarketplace(null)}
          platform={selectedMarketplace}
          platformName={MARKETPLACE_CONFIGS[selectedMarketplace]?.name || selectedMarketplace}
          existingIntegration={getMktIntegration(selectedMarketplace) as any}
          onSave={handleSaveMarketplace}
          onDisconnect={handleDisconnectMarketplace}
        />
      )}

      {/* Cargo Credential Modal */}
      {selectedCargo && (
        <CargoCredentialModal
          isOpen={!!selectedCargo}
          onClose={() => setSelectedCargo(null)}
          platform={selectedCargo}
          platformName={CARGO_PROVIDERS.find(p => p.id === selectedCargo)?.name || selectedCargo}
          existingIntegration={getCargoIntegration(selectedCargo)}
          onSave={handleSaveCargo}
          onTest={handleTestCargo}
        />
      )}
    </div>
  );
};
