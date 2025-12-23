import { useState, useEffect } from 'react'
import { CreditCard, Filter, Download, Search, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { adminApi } from '../../lib/apiMutator'

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
                url: '/payments/pos/transactions',
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
            'completed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'failed': 'bg-red-100 text-red-800',
            'refunded': 'bg-gray-100 text-gray-800'
        }

        const statusLabels: Record<string, string> = {
            'completed': 'Tamamlandı',
            'pending': 'Bekliyor',
            'failed': 'Başarısız',
            'refunded': 'İade'
        }

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[status] || status}
            </span>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ödeme Takibi</h1>
                    <p className="text-sm text-gray-600 mt-1">POS ve diğer ödeme işlemlerini takip edin</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Download className="w-4 h-4" />
                    Dışa Aktar
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Toplam Tutar</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(stats.total_amount)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">İşlem Sayısı</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_count}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Activity className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">POS İşlemleri</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pos_count}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <CreditCard className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Ortalama Tutar</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(stats.avg_amount)}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filtreler</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">POS Sağlayıcı</label>
                        <select
                            value={filter.provider}
                            onChange={(e) => handleFilterChange('provider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Tümü</option>
                            <option value="paytr">PayTR</option>
                            <option value="iyzico">Iyzico</option>
                            <option value="payu">PayU</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                        <input
                            type="date"
                            value={filter.start_date}
                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                        <input
                            type="date"
                            value={filter.end_date}
                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={applyFilters}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            Filtrele
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Ödeme İşlemleri</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchTransactions}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Henüz ödeme işlemi bulunmuyor</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tarih
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        İşlem ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tutar
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        POS Sağlayıcı
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ödeme Yöntemi
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Durum
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hasta
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(transaction.payment_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                            {transaction.pos_transaction_id || transaction.id.substring(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {formatCurrency(transaction.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {transaction.pos_provider ? (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                    {transaction.pos_provider.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {transaction.payment_method || 'Nakit'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {getStatusBadge(transaction.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {transaction.patient_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
