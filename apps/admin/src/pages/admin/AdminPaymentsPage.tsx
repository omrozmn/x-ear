import { useState, useEffect } from 'react'
import { CreditCard, Filter, Download, Search, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { adminApi } from '../../lib/apiMutator'
import { useAdminResponsive } from '@/hooks'
import { ResponsiveTable } from '@/components/responsive'

interface PaymentTransaction {
    id: string
    payment_date: string
    amount: number
    pos_provider?: string
    pos_transaction_id?: string
    payment_method: string
    status: string
    patient_name?: string
    sale_id?: string
    tenant_id: string
    created_at: string
}

export default function AdminPaymentsPage() {
    const { isMobile } = useAdminResponsive();
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState({
        provider: '',
        start_date: '',
        end_date: '',
        search: ''
    })

    // Stats
    const [stats, setStats] = useState({
        total_amount: 0,
        total_count: 0,
        pos_count: 0,
        avg_amount: 0
    })

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            setLoading(true)
            setError(null)

            const params: any = {}
            if (filter.provider) params.provider = filter.provider
            if (filter.start_date) params.start_date = filter.start_date
            if (filter.end_date) params.end_date = filter.end_date

            const response = await adminApi<{ success: boolean, data: PaymentTransaction[] }>({
                url: '/admin/payments/pos/transactions',
                params
            })

            if (response.success && response.data) {
                setTransactions(response.data)

                // Calculate stats
                const total = response.data.reduce((sum: number, t: PaymentTransaction) => sum + (t.amount || 0), 0)
                const posCount = response.data.filter((t: PaymentTransaction) => t.pos_provider).length

                setStats({
                    total_amount: total,
                    total_count: response.data.length,
                    pos_count: posCount,
                    avg_amount: response.data.length > 0 ? total / response.data.length : 0
                })
            } else {
                setError('Ödemeler yüklenemedi')
            }
        } catch (err: any) {
            console.error('Error fetching payments:', err)
            setError(err.message || 'Ödemeler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = (key: string, value: string) => {
        setFilter(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        fetchTransactions()
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'refunded': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }

        const statusLabels: Record<string, string> = {
            'completed': 'Tamamlandı',
            'pending': 'Bekliyor',
            'failed': 'Başarısız',
            'refunded': 'İade'
        }

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                {statusLabels[status] || status}
            </span>
        )
    }

    const columns = [
        {
            key: 'date',
            header: 'Tarih',
            render: (transaction: PaymentTransaction) => (
                <span className="text-sm text-gray-900 dark:text-white">
                    {formatDate(transaction.payment_date)}
                </span>
            )
        },
        {
            key: 'transaction_id',
            header: 'İşlem ID',
            mobileHidden: true,
            render: (transaction: PaymentTransaction) => (
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {transaction.pos_transaction_id || transaction.id.substring(0, 8)}
                </span>
            )
        },
        {
            key: 'amount',
            header: 'Tutar',
            render: (transaction: PaymentTransaction) => (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(transaction.amount)}
                </span>
            )
        },
        {
            key: 'provider',
            header: 'POS Sağlayıcı',
            mobileHidden: true,
            render: (transaction: PaymentTransaction) => (
                transaction.pos_provider ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium rounded">
                        {transaction.pos_provider.toUpperCase()}
                    </span>
                ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                )
            )
        },
        {
            key: 'payment_method',
            header: 'Ödeme Yöntemi',
            mobileHidden: true,
            render: (transaction: PaymentTransaction) => (
                <span className="text-sm text-gray-900 dark:text-white">
                    {transaction.payment_method || 'Nakit'}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            render: (transaction: PaymentTransaction) => getStatusBadge(transaction.status)
        },
        {
            key: 'patient',
            header: 'Hasta',
            mobileHidden: true,
            render: (transaction: PaymentTransaction) => (
                <span className="text-sm text-gray-900 dark:text-white">
                    {transaction.patient_name || '-'}
                </span>
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe space-y-6' : 'p-6 space-y-6'}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        Ödeme Takibi
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">POS ve diğer ödeme işlemlerini takip edin</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 touch-feedback">
                    <Download className="w-4 h-4" />
                    {!isMobile && 'Dışa Aktar'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Tutar</p>
                            <p className={`font-bold text-gray-900 dark:text-white mt-1 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                                {formatCurrency(stats.total_amount)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">İşlem Sayısı</p>
                            <p className={`font-bold text-gray-900 dark:text-white mt-1 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{stats.total_count}</p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">POS İşlemleri</p>
                            <p className={`font-bold text-gray-900 dark:text-white mt-1 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{stats.pos_count}</p>
                        </div>
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Ortalama Tutar</p>
                            <p className={`font-bold text-gray-900 dark:text-white mt-1 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                                {formatCurrency(stats.avg_amount)}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Filtreler</h3>
                </div>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">POS Sağlayıcı</label>
                        <select
                            value={filter.provider}
                            onChange={(e) => handleFilterChange('provider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Tümü</option>
                            <option value="paytr">PayTR</option>
                            <option value="iyzico">Iyzico</option>
                            <option value="payu">PayU</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Başlangıç Tarihi</label>
                        <input
                            type="date"
                            value={filter.start_date}
                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bitiş Tarihi</label>
                        <input
                            type="date"
                            value={filter.end_date}
                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={applyFilters}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center justify-center gap-2 touch-feedback"
                        >
                            <Search className="w-4 h-4" />
                            Filtrele
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Ödeme İşlemleri</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-4">Yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <button
                            onClick={fetchTransactions}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 touch-feedback"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Henüz ödeme işlemi bulunmuyor</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={transactions}
                        columns={columns}
                        keyExtractor={(transaction: PaymentTransaction) => transaction.id}
                        emptyMessage="Ödeme işlemi bulunamadı"
                    />
                )}
            </div>
        </div>
    )
}
