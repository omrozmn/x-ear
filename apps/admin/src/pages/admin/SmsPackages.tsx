import React, { useState } from 'react';
import {
    Package,
    Plus,
    Edit2,
    Check,
    Loader2
} from 'lucide-react';
import { Button, Input, Textarea } from '@x-ear/ui-web';
import {
    useListAdminSmPackages,
    useCreateAdminSmPackages,
    useUpdateAdminSmPackage,
    type DetailedSmsPackageRead,
    type ListAdminSmPackagesParams,
    type ResponseEnvelopeListDetailedSmsPackageRead,
    type SmsPackageCreate,
    type SmsPackageUpdate,
} from '../../lib/api-client';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import Pagination from '../../components/ui/Pagination';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';
import { unwrapArray, unwrapData } from '@/lib/orval-response';

interface PackagePagination {
    total?: number;
    totalPages?: number;
}

interface PackageFormData {
    name: string;
    description: string;
    smsCount: number;
    price: number;
    currency: string;
    isActive: boolean;
}

function getPackages(data: ResponseEnvelopeListDetailedSmsPackageRead | undefined): DetailedSmsPackageRead[] {
    return unwrapArray<DetailedSmsPackageRead>(data);
}

function getPagination(data: ResponseEnvelopeListDetailedSmsPackageRead | undefined): PackagePagination {
    const payload = unwrapData<Record<string, unknown>>(data);
    const metaSource = payload && typeof payload === 'object' && 'meta' in payload ? payload.meta : undefined;
    const meta = typeof metaSource === 'object' && metaSource !== null ? metaSource as Record<string, unknown> : undefined;
    return {
        total: typeof meta?.total === 'number' ? meta.total : 0,
        totalPages: typeof meta?.totalPages === 'number' ? meta.totalPages : 1,
    };
}

function toFormData(pkg?: DetailedSmsPackageRead | null): PackageFormData {
    return {
        name: pkg?.name ?? '',
        description: pkg?.description ?? '',
        smsCount: pkg?.smsCount ?? 1000,
        price: typeof pkg?.price === 'number' ? pkg.price : Number(pkg?.price ?? 0),
        currency: 'TRY',
        isActive: pkg?.isActive ?? true,
    };
}

export default function SMSPackagesPage() {
    const { isMobile } = useAdminResponsive();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPkg, setEditingPkg] = useState<DetailedSmsPackageRead | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const packageParams: ListAdminSmPackagesParams = { page, limit };

    const { data: packagesData, isLoading, refetch } = useListAdminSmPackages(packageParams);

    const createMutation = useCreateAdminSmPackages();
    const updateMutation = useUpdateAdminSmPackage();

    const [formData, setFormData] = useState<PackageFormData>(toFormData());
    const packages = getPackages(packagesData).filter((pkg) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [pkg.name, pkg.description || '', String(pkg.smsCount || ''), String(pkg.price || '')]
            .some((value) => value.toLowerCase().includes(query));
    });
    const pagination = getPagination(packagesData);

    const handleSave = async () => {
        if (!formData.name || formData.smsCount <= 0 || formData.price < 0) {
            toast.error('Lütfen geçerli değerler giriniz');
            return;
        }

        try {
            const payload: SmsPackageCreate = {
                name: formData.name,
                description: formData.description,
                smsCount: formData.smsCount,
                price: formData.price,
                currency: formData.currency,
                isActive: formData.isActive,
            };

            if (editingPkg) {
                const updatePayload: SmsPackageUpdate = payload;
                await updateMutation.mutateAsync({
                    packageId: editingPkg.id,
                    data: updatePayload
                });
                toast.success('Paket güncellendi');
            } else {
                await createMutation.mutateAsync({
                    data: payload
                });
                toast.success('Paket oluşturuldu');
            }

            setIsCreateOpen(false);
            setEditingPkg(null);
            setFormData(toFormData());
            refetch();
        } catch {
            toast.error('İşlem başarısız');
        }
    };

    const openEdit = (pkg: DetailedSmsPackageRead) => {
        setEditingPkg(pkg);
        setFormData(toFormData(pkg));
        setIsCreateOpen(true);
    };

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6 max-w-7xl mx-auto'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>SMS Paketleri</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Satışa sunulan SMS paketlerini yönetin</p>
                </div>
                <Button onClick={() => { setEditingPkg(null); setIsCreateOpen(true); }} className="touch-feedback">
                    <Plus className="w-4 h-4 mr-2" />
                    {!isMobile && 'Yeni Paket'}
                </Button>
            </div>
            <div className="mb-6 max-w-md">
                <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Paket adı, açıklama, adet veya fiyat ara..."
                />
            </div>

            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {isLoading ? (
                    <div className="col-span-3 flex justify-center p-8"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" /></div>
                ) : (
                    packages.map((pkg) => (
                        <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)} className="touch-feedback">
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                        {pkg.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 min-h-[40px]">{pkg.description}</p>

                            <div className="flex justify-between items-end border-t dark:border-gray-700 pt-4">
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">SMS Adedi</span>
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">{(pkg.smsCount || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Fiyat</span>
                                    <span className="font-bold text-xl text-indigo-600 dark:text-indigo-400">
                                        {Number(pkg.price || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <Pagination
                currentPage={page}
                totalPages={pagination.totalPages ?? 1}
                totalItems={pagination.total ?? 0}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={setLimit}
            />

            {/* Create/Edit Modal */}
            <Dialog.Root open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-xl w-full max-w-md z-50">
                        <Dialog.Title className="text-lg font-bold mb-4">
                            {editingPkg ? 'Paketi Düzenle' : 'Yeni SMS Paketi'}
                        </Dialog.Title>
                        <Dialog.Description className="text-sm text-gray-500 mb-4">
                            Paket bilgilerini aşağıdan düzenleyebilirsiniz.
                        </Dialog.Description>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Paket Adı</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Örn: 1000 SMS Paketi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Açıklama</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Paket detayları..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">SMS Adedi</label>
                                    <Input
                                        type="number"
                                        value={formData.smsCount}
                                        onChange={(e) => setFormData({ ...formData, smsCount: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fiyat (TRY)</label>
                                    <Input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Satışa Açık</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>İptal</Button>
                                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Kaydet
                                </Button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
