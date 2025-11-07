import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useSupplier } from '@/hooks/useSuppliers';
import { Button, Badge } from '@x-ear/ui-web';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  CreditCard,
  Globe,
  Calendar,
  Edit,
  RefreshCw
} from 'lucide-react';
import type { SupplierExtended } from '@/components/suppliers/supplier-search.types';

export default function SupplierDetailPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams({ from: '/suppliers/$supplierId' });
  const { data: supplier, isLoading, error } = useSupplier(supplierId);

  const supplierData = supplier as SupplierExtended | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !supplierData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-medium mb-2">Hata</h3>
            <p className="text-red-600 text-sm">Tedarikçi bilgileri yüklenemedi.</p>
            <Button 
              variant="outline" 
              onClick={() => navigate({ to: '/suppliers' })} 
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Listeye Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate({ to: '/suppliers' })}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tedarikçiler
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {supplierData.companyName || supplierData.name}
                </h1>
                <p className="text-gray-500 mt-1">
                  {supplierData.companyCode && `Kod: ${supplierData.companyCode}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={supplierData.isActive ? 'success' : 'secondary'}>
                {supplierData.isActive ? 'Aktif' : 'Pasif'}
              </Badge>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Düzenle
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-400" />
                İletişim Bilgileri
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {supplierData.contactPerson && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Yetkili Kişi</p>
                    <p className="text-sm font-medium text-gray-900">{supplierData.contactPerson}</p>
                  </div>
                )}
                {supplierData.email && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <a href={`mailto:${supplierData.email}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      {supplierData.email}
                    </a>
                  </div>
                )}
                {supplierData.phone && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Telefon</p>
                    <a href={`tel:${supplierData.phone}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      {supplierData.phone}
                    </a>
                  </div>
                )}
                {supplierData.mobile && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Mobil</p>
                    <a href={`tel:${supplierData.mobile}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      {supplierData.mobile}
                    </a>
                  </div>
                )}
                {supplierData.website && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Website</p>
                    <a href={supplierData.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      {supplierData.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            {(supplierData.address || supplierData.city) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  Adres Bilgileri
                </h2>
                <div className="space-y-2">
                  {supplierData.address && (
                    <p className="text-sm text-gray-700">{supplierData.address}</p>
                  )}
                  <p className="text-sm text-gray-700">
                    {supplierData.city && `${supplierData.city}`}
                    {supplierData.postalCode && `, ${supplierData.postalCode}`}
                    {supplierData.country && supplierData.country !== 'Türkiye' && `, ${supplierData.country}`}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {supplierData.notes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-400" />
                  Notlar
                </h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{supplierData.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-gray-400" />
                Şirket Bilgileri
              </h2>
              <div className="space-y-3">
                {supplierData.taxNumber && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Vergi Numarası</p>
                    <p className="text-sm font-medium text-gray-900">{supplierData.taxNumber}</p>
                  </div>
                )}
                {supplierData.taxOffice && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Vergi Dairesi</p>
                    <p className="text-sm font-medium text-gray-900">{supplierData.taxOffice}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            {(supplierData.paymentTerms || supplierData.currency) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
                  Ödeme Bilgileri
                </h2>
                <div className="space-y-3">
                  {supplierData.paymentTerms && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ödeme Koşulları</p>
                      <p className="text-sm font-medium text-gray-900">{supplierData.paymentTerms}</p>
                    </div>
                  )}
                  {supplierData.currency && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Para Birimi</p>
                      <p className="text-sm font-medium text-gray-900">{supplierData.currency}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                Tarihler
              </h2>
              <div className="space-y-3">
                {supplierData.createdAt && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Oluşturulma</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(supplierData.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
                {supplierData.updatedAt && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Son Güncelleme</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(supplierData.updatedAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}