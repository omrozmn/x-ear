import React, { useState } from 'react';
import {
    Package,
    Plus,
    Edit2,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import {
    useGetApiAdminSmsPackages,
    usePostApiAdminSmsPackages,
    usePutApiAdminSmsPackagesPkgId
} from '../../lib/api-client';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import Pagination from '../../components/ui/Pagination';

export default function SMSPackagesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPkg, setEditingPkg] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: packagesData, isLoading, refetch } = useGetApiAdminSmsPackages({ page, limit } as any);

    const createMutation = usePostApiAdminSmsPackages();
    const updateMutation = usePutApiAdminSmsPackagesPkgId();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        smsCount: 1000,
        price: 0,
        currency: 'TRY',
        isActive: true
    });

    const handleSave = async () => {
        if (!formData.name || formData.smsCount <= 0 || formData.price < 0) {
            toast.error('Lütfen geçerli değerler giriniz');
            return;
        }

        try {
            if (editingPkg) {
                await updateMutation.mutateAsync({
                    pkgId: editingPkg.id,
                    data: {
                        name: formData.name,
                        description: formData.description,
                        smsCount: formData.smsCount,
                        price: formData.price,
                        isActive: formData.isActive
                    }
                });
                toast.success('Paket güncellendi');
            } else {
                await createMutation.mutateAsync({
                    data: formData
                });
                toast.success('Paket oluşturuldu');
            }

            setIsCreateOpen(false);
            setEditingPkg(null);
            setFormData({ name: '', description: '', smsCount: 1000, price: 0, currency: 'TRY', isActive: true });
            refetch();
        } catch (error) {
            toast.error('İşlem başarısız');
            console.error(error);
        }
    };

    const openEdit = (pkg: any) => {
        setEditingPkg(pkg);
        setFormData({
            name: pkg.name,
            description: pkg.description || '',
            smsCount: pkg.smsCount,
            price: pkg.price,
            currency: pkg.currency,
            isActive: pkg.isActive
        });
        setIsCreateOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SMS Paketleri</h1>
                    <p className="text-gray-500">Satışa sunulan SMS paketlerini yönetin</p>
                </div>
                <Button onClick={() => { setEditingPkg(null); setIsCreateOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Paket
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    packagesData?.data?.map((pkg: any) => (
                        <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {pkg.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-6 min-h-[40px]">{pkg.description}</p>

                            <div className="flex justify-between items-end border-t pt-4">
                                <div>
                                    <span className="text-xs text-gray-500 block">SMS Adedi</span>
                                    <span className="font-bold text-lg">{(pkg.smsCount || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 block">Fiyat</span>
                                    <span className="font-bold text-xl text-indigo-600">
                                        {(pkg.price || 0).toLocaleString('tr-TR', { style: 'currency', currency: pkg.currency || 'TRY' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <Pagination
                currentPage={page}
                totalPages={(packagesData as any)?.pagination?.totalPages || 1}
                totalItems={(packagesData as any)?.pagination?.total || 0}
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
