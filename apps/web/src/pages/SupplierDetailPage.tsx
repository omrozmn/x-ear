import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Badge, Loading } from '@x-ear/ui-web';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Globe, Edit, Trash2 } from 'lucide-react';
import { useSupplier, useDeleteSupplier, useUpdateSupplier, useSupplierProducts } from '../hooks/useSuppliers';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { SupplierExtended } from '../components/suppliers/supplier-search.types';

export function SupplierDetailPage() {
  const { supplierId } = useParams({ strict: false }) as { supplierId: string };
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: supplier, isLoading, error } = useSupplier(supplierId);
  // Cast to Extended type to access extra fields if needed
  const supplierData = supplier as unknown as SupplierExtended;

  const { data: productsData, isLoading: productsLoading, error: productsError } = useSupplierProducts(supplierData?.companyName || supplierData?.name);
  const deleteSupplierMutation = useDeleteSupplier();
  const updateSupplierMutation = useUpdateSupplier();

  const handleBack = () => {
    navigate({ to: '/suppliers' });
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Bu tedarikçiyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteSupplierMutation.mutateAsync(supplierId);
        navigate({ to: '/suppliers' });
      } catch (error) {
        console.error('Failed to delete supplier:', error);
      }
    }
  };

  const handleSave = async (data: any) => {
    try {
      await updateSupplierMutation.mutateAsync({
        supplierId,
        updates: data
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update supplier:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Tedarikçi bulunamadı</h2>
        <Button onClick={handleBack}>Geri Dön</Button>
      </div>
    );
  }

  // Cast to Extended type to access extra fields if needed


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tedarikçilere Dön
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{supplierData.companyName || supplierData.name}</h1>
              <div className="flex items-center mt-1 space-x-2">
                {supplierData.companyCode && (
                  <Badge variant="secondary">{supplierData.companyCode}</Badge>
                )}
                {supplierData.isActive ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h3>
            <div className="space-y-4">
              {supplierData.contactPerson && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{supplierData.contactPerson}</span>
                </div>
              )}
              {supplierData.email && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <a href={`mailto:${supplierData.email}`} className="text-sm hover:text-blue-600">
                    {supplierData.email}
                  </a>
                </div>
              )}
              {supplierData.phone && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{supplierData.phone}</span>
                </div>
              )}
              {supplierData.website && (
                <div className="flex items-center text-gray-600">
                  <div className="w-8 flex-shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <a href={supplierData.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-blue-600">
                    {supplierData.website}
                  </a>
                </div>
              )}
              {(supplierData.address || supplierData.city) && (
                <div className="flex items-start text-gray-600">
                  <div className="w-8 flex-shrink-0 mt-0.5">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="text-sm">
                    {[supplierData.address, supplierData.city, supplierData.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Finansal Bilgiler</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Vergi No</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.taxNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Vergi Dairesi</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.taxOffice || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Para Birimi</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.currency || 'TRY'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Ödeme Koşulları</span>
                <span className="text-sm font-medium text-gray-900">{supplierData.paymentTerms || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
            <Tabs defaultValue="products" className="w-full">
              <div className="border-b border-gray-200 px-6">
                <TabsList className="bg-transparent border-b-0">
                  <TabsTrigger value="products" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3">
                    Ürünler
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3">
                    Sipariş Geçmişi
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3">
                    Notlar
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="products">
                  {productsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loading size="md" />
                    </div>
                  ) : productsError ? (
                    <div className="text-red-500 text-center py-8">Ürünler yüklenirken hata oluştu.</div>
                  ) : productsData?.data?.products?.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maliyet</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslim Süresi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {productsData.data.products.map((item: any) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.supplier_product_name || item.product?.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.supplier_product_code || item.product?.sku || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.unit_cost ? `${item.unit_cost} ${item.currency}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.lead_time_days ? `${item.lead_time_days} Gün` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Bu tedarikçiye ait ürün bulunamadı.</p>
                      {/* <Button variant="outline" className="mt-4">Ürün Ekle</Button> */}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="orders">
                  <div className="text-center py-12 text-gray-500">
                    <p>Sipariş geçmişi özelliği yakında eklenecektir.</p>
                    <p className="text-xs mt-2">(Tedarikçi faturaları entegrasyonu bekleniyor)</p>
                  </div>
                </TabsContent>
                <TabsContent value="notes">
                  <div className="space-y-4">
                    {supplierData.notes ? (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-gray-700">
                        {supplierData.notes}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center">Not eklenmemiş.</p>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      <SupplierFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        supplier={supplierData}
        isLoading={updateSupplierMutation.isPending}
      />
    </div>
  );
}

export default SupplierDetailPage;
