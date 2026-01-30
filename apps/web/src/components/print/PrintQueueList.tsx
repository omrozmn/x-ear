import { usePrintQueue } from '@/hooks/usePrintQueue';
import { Loader2, Printer, AlertCircle, CheckCircle2, Clock } from 'lucide-react';


export const PrintQueueList = () => {
  // Hook does not accept arguments based on definition
  const { queue, isLoading, error, refetch, processQueue, isProcessing } = usePrintQueue();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Yazdırma kuyruğu yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-900">Yazdırma kuyruğu yüklenemedi</h3>
            <p className="mt-1 text-sm text-red-700">{error instanceof Error ? error.message : 'Bir hata oluştu'}</p>
            <button
              data-allow-raw="true"
              onClick={() => refetch()}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items = queue?.items || [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Printer className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Yazdırma kuyruğu boş</h3>
        <p className="mt-1 text-sm text-gray-500">Henüz yazdırılacak belge yok</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'failed':
        return 'Başarısız';
      case 'processing':
        return 'İşleniyor';
      case 'pending':
        return 'Beklemede';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Yazdırma Kuyruğu ({items.length})
        </h3>
        {items.some(item => item.status === 'pending') && (
          <button
            data-allow-raw="true"
            onClick={() => processQueue()}
            disabled={isProcessing}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Tümünü Yazdır
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(item.status as string || '')}
                  <span className="text-sm font-medium text-gray-900">
                    Fatura {item.invoiceNumber as string || ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Kopya:</span>
                    <span className="font-medium text-gray-900">{item.copies || 1}</span>
                  </div>
                  {item.queuedAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Oluşturulma:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(item.queuedAt as string).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  )}
                  {item.partyName && (
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-gray-600">Müşteri:</span>
                      <span className="font-medium text-gray-900">{item.partyName as string}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    item.status as string || ''
                  )}`}
                >
                  {getStatusText(item.status as string || '')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
