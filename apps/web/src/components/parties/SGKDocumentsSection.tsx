import React, { useState, useMemo } from 'react';
import { Button, Select, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { Download, Eye, Filter } from 'lucide-react';

interface DeliveredEReceipt {
  id: string;
  number: string;
  date: string;
  doctorName: string;
  validUntil: string;
  materials: Array<{
    code: string;
    name: string;
    applicationDate: string;
    deliveryStatus: 'delivered';
  }>;
  sgkDocumentAvailable: boolean; // SGK'dan belge çekilip çekilmediği
  partyFormAvailable: boolean; // Hasta işlem formu indirilebilir durumda mı
}

interface SGKDocumentsSectionProps {
  deliveredEReceipts: DeliveredEReceipt[];
  onDownloadPartyForm?: (eReceiptId: string) => void;
  onDownloadAllPartyForms?: (selectedMonth?: string) => void;
  onError?: (message: string) => void;
}

export const SGKDocumentsSection: React.FC<SGKDocumentsSectionProps> = ({
  deliveredEReceipts,
  onDownloadPartyForm,
  onDownloadAllPartyForms,
  onError
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedEReceipt, setSelectedEReceipt] = useState<DeliveredEReceipt | null>(null);

  // Aylık filtreleme için benzersiz aylar
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    deliveredEReceipts.forEach(receipt => {
      const date = new Date(receipt.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [deliveredEReceipts]);

  // Filtrelenmiş e-reçeteler
  const filteredEReceipts = useMemo(() => {
    if (!selectedMonth) return deliveredEReceipts;

    return deliveredEReceipts.filter(receipt => {
      const date = new Date(receipt.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [deliveredEReceipts, selectedMonth]);

  // Ay ismini formatla
  const formatMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  };

  const handleDownloadPartyForm = (eReceiptId: string) => {
    if (onDownloadPartyForm) {
      onDownloadPartyForm(eReceiptId);
    } else {
      if (onError) {
        onError('Hasta işlem formu indirme özelliği henüz uygulanmamış');
      }
    }
  };

  const handleDownloadAllPartyForms = () => {
    if (onDownloadAllPartyForms) {
      onDownloadAllPartyForms(selectedMonth);
    } else {
      if (onError) {
        onError('Toplu indirme özelliği henüz uygulanmamış');
      }
    }
  };

  const handleViewDetails = (eReceipt: DeliveredEReceipt) => {
    setSelectedEReceipt(eReceipt);
  };

  const sgkColumns: Column<DeliveredEReceipt>[] = [
    {
      key: 'number',
      title: 'E-Reçete No',
      render: (_, r) => <span className="text-sm font-medium text-gray-900">{r.number}</span>,
    },
    {
      key: 'date',
      title: 'Tarih',
      render: (_, r) => <span className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString('tr-TR')}</span>,
    },
    {
      key: 'doctorName',
      title: 'Doktor',
      render: (_, r) => <span className="text-sm text-gray-500">{r.doctorName}</span>,
    },
    {
      key: '_materials',
      title: 'Malzeme Sayısı',
      render: (_, r) => <span className="text-sm text-gray-500">{r.materials.length}</span>,
    },
    {
      key: 'sgkDocumentAvailable',
      title: 'SGK Belge',
      render: (_, r) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          r.sgkDocumentAvailable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {r.sgkDocumentAvailable ? 'Mevcut' : 'Bekleniyor'}
        </span>
      ),
    },
    {
      key: '_actions',
      title: 'İşlemler',
      render: (_, r) => (
        <div className="space-x-2">
          <Button size="sm" variant="outline" onClick={() => handleViewDetails(r)}>
            <Eye className="w-4 h-4" />
          </Button>
          {r.partyFormAvailable && (
            <Button
              size="sm"
              onClick={() => handleDownloadPartyForm(r.id)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-1" />
              Hasta İşlem Formu
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Belge İndirme</h3>

          {/* Aylık Filtre */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={[
                  { value: "", label: "Tüm Aylar" },
                  ...availableMonths.map(month => ({
                    value: month,
                    label: formatMonthName(month)
                  }))
                ]}
              />
            </div>

            {/* Toplu İndirme Butonu */}
            <Button
              onClick={handleDownloadAllPartyForms}
              disabled={filteredEReceipts.length === 0}
              className="premium-gradient tactile-press text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Tüm İşlem Formlarını İndir ({filteredEReceipts.length})
            </Button>
          </div>
        </div>

        <DataTable<DeliveredEReceipt>
          data={filteredEReceipts}
          columns={sgkColumns}
          rowKey="id"
          emptyText={selectedMonth ? 'Bu ay için teslim edilmiş e-reçete bulunamadı' : 'Henüz teslim edilmiş e-reçete yok'}
        />
      </div>

      {/* Detay Modal */}
      {selectedEReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">E-Reçete Detayları - {selectedEReceipt.number}</h3>
                <button data-allow-raw="true"
                  onClick={() => setSelectedEReceipt(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Temel Bilgiler */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-Reçete No</label>
                    <p className="text-sm text-gray-900">{selectedEReceipt.number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tarih</label>
                    <p className="text-sm text-gray-900">{new Date(selectedEReceipt.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Doktor</label>
                    <p className="text-sm text-gray-900">{selectedEReceipt.doctorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Geçerlilik</label>
                    <p className="text-sm text-gray-900">{new Date(selectedEReceipt.validUntil).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                {/* SGK Belge Durumu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SGK Belge Durumu</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    selectedEReceipt.sgkDocumentAvailable
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedEReceipt.sgkDocumentAvailable ? 'SGK Belgesi Mevcut' : 'SGK Belgesi Bekleniyor'}
                  </span>
                </div>

                {/* Malzemeler */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">Teslim Edilen Malzemeler</label>
                  <div className="space-y-3">
                    {selectedEReceipt.materials.map((material, index) => (
                      <div key={`${material.code}-${index}`} className="border rounded-2xl p-4 bg-green-50 border-green-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-green-800">{material.name}</p>
                            <p className="text-sm text-green-600">Kod: {material.code}</p>
                            <p className="text-sm text-green-600">Başvuru Tarihi: {new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Teslim Edildi
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* İşlem Butonları */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedEReceipt.partyFormAvailable && (
                    <Button
                      onClick={() => handleDownloadPartyForm(selectedEReceipt.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Hasta İşlem Formunu İndir
                    </Button>
                  )}
                  <Button onClick={() => setSelectedEReceipt(null)} variant="outline">
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
