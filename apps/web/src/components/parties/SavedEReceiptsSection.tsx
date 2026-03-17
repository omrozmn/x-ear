import React, { useState } from 'react';
import { Button } from '@x-ear/ui-web';
import { FileText, Eye, Truck, Edit, Download } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import toast from 'react-hot-toast';

export interface SavedEReceiptMaterial {
  code: string;
  name: string;
  applicationDate: string;
  deliveryStatus: 'saved' | 'delivered';
}

export interface SavedEReceipt {
  id: string;
  number: string;
  date: string;
  doctorName: string;
  validUntil: string;
  materials: SavedEReceiptMaterial[];
  status: 'saved' | 'delivered';
  sgkDocumentAvailable?: boolean; // SGK'dan belge çekilip çekilmediği
  partyFormAvailable?: boolean; // Hasta işlem formu indirilebilir durumda mı
}

interface SavedEReceiptsSectionProps {
  savedEReceipts: SavedEReceipt[];
  savedEReceiptsLoading: boolean;
  onDeliverMaterial?: (eReceiptId: string, materialCode: string) => void;
  onDeliverAllMaterials?: (eReceiptId: string) => void;
  onEditEReceipt?: (eReceipt: SavedEReceipt) => void;
  onDownloadPartyForm?: (eReceiptId: string) => void;
  onError?: (message: string) => void;
}

export const SavedEReceiptsSection: React.FC<SavedEReceiptsSectionProps> = ({
  savedEReceipts,
  savedEReceiptsLoading,
  onDeliverMaterial,
  onDeliverAllMaterials,
  onEditEReceipt,
  onDownloadPartyForm,
  onError
}) => {
  const [previewEReceipt, setPreviewEReceipt] = useState<SavedEReceipt | null>(null);
  const [editingEReceipt, setEditingEReceipt] = useState<SavedEReceipt | null>(null);
  const [editFormData, setEditFormData] = useState<SavedEReceipt | null>(null);

  const getStatusText = (status: 'saved' | 'delivered') => {
    switch (status) {
      case 'saved': return 'Kaydedildi';
      case 'delivered': return 'Teslim Edildi';
      default: return 'Beklemede';
    }
  };

  const getMaterialStatusText = (status: 'saved' | 'delivered') => {
    switch (status) {
      case 'saved': return 'Beklemede';
      case 'delivered': return 'Teslim Edildi';
      default: return 'Beklemede';
    }
  };

  const handleDeliverMaterial = (eReceiptId: string, materialCode: string) => {
    if (onDeliverMaterial) {
      onDeliverMaterial(eReceiptId, materialCode);
    }
  };

  const handleDeliverAllMaterials = (eReceiptId: string) => {
    if (onDeliverAllMaterials) {
      onDeliverAllMaterials(eReceiptId);
    }
  };

  const handleEditEReceipt = (eReceipt: SavedEReceipt) => {
    setEditingEReceipt(eReceipt);
    setEditFormData({
      ...eReceipt,
      materials: eReceipt.materials.map(m => ({ ...m }))
    });
  };

  const handleSaveEdit = () => {
    if (!editFormData || !onEditEReceipt) return;

    // Form validation
    if (!editFormData.doctorName.trim()) {
      if (onError) {
        onError('Doktor adı zorunludur');
      } else {
        toast('Doktor adı zorunludur');
      }
      return;
    }

    if (!editFormData.validUntil) {
      if (onError) {
        onError('Geçerlilik tarihi zorunludur');
      } else {
        toast('Geçerlilik tarihi zorunludur');
      }
      return;
    }

    // Check if all materials have valid dates
    const invalidMaterials = editFormData.materials.filter((m: SavedEReceiptMaterial) =>
      !m.applicationDate || new Date(m.applicationDate) > new Date()
    );

    if (invalidMaterials.length > 0) {
      if (onError) {
        onError('Geçerli başvuru tarihleri giriniz');
      } else {
        toast('Geçerli başvuru tarihleri giriniz');
      }
      return;
    }

    onEditEReceipt(editFormData);
    setEditingEReceipt(null);
    setEditFormData(null);
  };

  const handleCancelEdit = () => {
    setEditingEReceipt(null);
    setEditFormData(null);
  };

  const updateEditFormData = (field: string, value: string | SavedEReceiptMaterial[]) => {
    setEditFormData((prev: SavedEReceipt | null) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const updateMaterialDate = (materialIndex: number, date: string) => {
    setEditFormData((prev: SavedEReceipt | null) => {
      if (!prev) return null;
      return {
        ...prev,
        materials: prev.materials.map((m: SavedEReceiptMaterial, i: number) =>
          i === materialIndex ? { ...m, applicationDate: date } : m
        )
      };
    });
  };

  const updateMaterialStatus = (materialIndex: number, status: 'saved' | 'delivered') => {
    setEditFormData((prev: SavedEReceipt | null) => {
      if (!prev) return null;
      return {
        ...prev,
        materials: prev.materials.map((m: SavedEReceiptMaterial, i: number) =>
          i === materialIndex ? { ...m, deliveryStatus: status } : m
        )
      };
    });
  };

  const handlePreviewEReceipt = (eReceipt: SavedEReceipt) => {
    setPreviewEReceipt(eReceipt);
  };

  return (
    <>
      <div className="bg-card rounded-2xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Kayıtlı E-Reçeteler</h3>

        {savedEReceiptsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : savedEReceipts.length > 0 ? (
          <div className="space-y-4">
            {savedEReceipts.map((receipt) => {
              const hasUndeliveredMaterials = receipt.materials.some(m => m.deliveryStatus === 'saved');
              return (
                <div key={receipt.id} className="border rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h5 className="font-medium">E-Reçete #{receipt.number}</h5>
                      <p className="text-sm text-muted-foreground">Tarih: {new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                      <p className="text-sm text-muted-foreground">Doktor: {receipt.doctorName}</p>
                      <p className="text-sm text-muted-foreground">Geçerlilik: {new Date(receipt.validUntil).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={getStatusText(receipt.status)} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewEReceipt(receipt)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEReceipt(receipt)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {hasUndeliveredMaterials && onDeliverAllMaterials && (
                        <Button
                          size="sm"
                          onClick={() => handleDeliverAllMaterials(receipt.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          Tümünü Teslim Et
                        </Button>
                      )}
                      {receipt.status === 'delivered' && receipt.sgkDocumentAvailable && receipt.partyFormAvailable && onDownloadPartyForm && (
                        <Button
                          size="sm"
                          onClick={() => onDownloadPartyForm(receipt.id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Hasta İşlem Formu
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h6 className="font-medium text-sm text-foreground">Malzemeler:</h6>
                    {receipt.materials.map((material, index) => (
                      <div key={`${material.code}-${index}`} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">Kod: {material.code} • Başvuru: {new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${material.deliveryStatus === 'delivered'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-yellow-800'
                            }`}>
                            {getMaterialStatusText(material.deliveryStatus)}
                          </span>
                          {material.deliveryStatus === 'saved' && onDeliverMaterial && (
                            <Button
                              size="sm"
                              onClick={() => handleDeliverMaterial(receipt.id, material.code)}
                              className="premium-gradient tactile-press text-white"
                            >
                              <Truck className="w-3 h-3 mr-1" />
                              Teslim Et
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>Henüz e-reçete oluşturulmamış</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewEReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">E-Reçete Detayları</h3>
                <button data-allow-raw="true"
                  onClick={() => setPreviewEReceipt(null)}
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">E-Reçete No</label>
                    <p className="text-sm text-foreground">{previewEReceipt.number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Tarih</label>
                    <p className="text-sm text-foreground">{new Date(previewEReceipt.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Doktor</label>
                    <p className="text-sm text-foreground">{previewEReceipt.doctorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Geçerlilik</label>
                    <p className="text-sm text-foreground">{new Date(previewEReceipt.validUntil).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Malzemeler</label>
                  <div className="space-y-2">
                    {previewEReceipt.materials.map((material, index) => (
                      <div key={`${material.code}-${index}`} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{material.name}</p>
                            <p className="text-sm text-muted-foreground">Kod: {material.code}</p>
                            <p className="text-sm text-muted-foreground">Başvuru Tarihi: {new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${material.deliveryStatus === 'delivered'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-yellow-800'
                            }`}>
                            {getMaterialStatusText(material.deliveryStatus)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => setPreviewEReceipt(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEReceipt && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">E-Reçete Düzenle</h3>
                <button data-allow-raw="true"
                  onClick={handleCancelEdit}
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      E-Reçete No
                    </label>
                    <input data-allow-raw="true"
                      type="text"
                      value={editFormData.number}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-xl bg-muted text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Doktor Adı *
                    </label>
                    <input data-allow-raw="true"
                      type="text"
                      value={editFormData.doctorName}
                      onChange={(e) => updateEditFormData('doctorName', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Geçerlilik Tarihi *
                    </label>
                    <input data-allow-raw="true"
                      type="date"
                      value={editFormData.validUntil}
                      onChange={(e) => updateEditFormData('validUntil', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-4">
                    Malzemeler
                  </label>
                  <div className="space-y-3">
                    {editFormData.materials.map((material: SavedEReceiptMaterial, index: number) => (
                      <div key={`${material.code}-${index}`} className="border rounded-2xl p-4 bg-muted">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Malzeme Kodu
                            </label>
                            <input data-allow-raw="true"
                              type="text"
                              value={material.code}
                              disabled
                              className="w-full px-3 py-2 border border-border rounded-xl bg-muted text-muted-foreground"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Malzeme Adı
                            </label>
                            <input data-allow-raw="true"
                              type="text"
                              value={material.name}
                              disabled
                              className="w-full px-3 py-2 border border-border rounded-xl bg-muted text-muted-foreground"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Başvuru Tarihi *
                            </label>
                            <input data-allow-raw="true"
                              type="date"
                              value={material.applicationDate}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => updateMaterialDate(index, e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Teslim Durumu
                            </label>
                            <select data-allow-raw="true"
                              value={material.deliveryStatus}
                              onChange={(e) => updateMaterialStatus(index, e.target.value as 'saved' | 'delivered')}
                              className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-blue-500"
                            >
                              <option value="saved">Beklemede</option>
                              <option value="delivered">Teslim Edildi</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button onClick={handleCancelEdit} variant="outline">
                  İptal
                </Button>
                <Button onClick={handleSaveEdit}>
                  Kaydet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};