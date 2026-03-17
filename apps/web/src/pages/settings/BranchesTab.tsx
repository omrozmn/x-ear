import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Pencil, AlertCircle, AlertTriangle, MapPin, Phone, Mail } from 'lucide-react';
import { branchService, Branch } from '../../services/branch.service';
import { Button, Input, Textarea, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';
import { useTranslation } from 'react-i18next';

interface ConfirmationModal {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
}

export function BranchesTab() {
  const { t } = useTranslation('settings_extra');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: ''
    });
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    // Confirmation Modal State
    const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    const fetchBranches = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await branchService.getBranches();
            setBranches(data);
        } catch (error: unknown) {
            console.error('Failed to fetch branches:', error);
            setError('Subeler yuklenirken bir hata olustu.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        try {
            if (editingBranch) {
                await branchService.updateBranch(editingBranch.id, formData);
                toast.success('Sube basariyla guncellendi');
            } else {
                await branchService.createBranch(formData);
                toast.success('Sube basariyla olusturuldu');
            }

            setIsModalOpen(false);
            resetForm();
            fetchBranches();
        } catch (err: unknown) {
            // Handle error object - extract message string
            const errorData = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error;
            const msg = (typeof errorData === 'object' && errorData !== null && 'message' in errorData && typeof errorData.message === 'string')
                ? errorData.message
                : (typeof errorData === 'string' ? errorData : 'İşlem gerçekleştirilemedi.');
            setFormError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmationModal({
            isOpen: true,
            title: t('deleteBranch', 'Subeyi Sil'),
            message: t('deleteBranchConfirm', 'Bu subeyi silmek istediginize emin misiniz? Bu islem geri alinamaz.'),
            type: 'danger',
            onConfirm: async () => {
                try {
                    await branchService.deleteBranch(id);
                    toast.success('Sube silindi');
                    fetchBranches();
                } catch (err: unknown) {
                    const errorData = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error;
                    const msg = (typeof errorData === 'object' && errorData !== null && 'message' in errorData && typeof errorData.message === 'string')
                        ? errorData.message
                        : 'Şube silinemedi';
                    toast.error(msg);
                }
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const openEditModal = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            email: branch.email || ''
        });
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingBranch(null);
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: ''
        });
        setFormError('');
    };

    const branchColumns: Column<Branch>[] = [
        {
            key: 'name',
            title: t('branchName', 'Şube Adı'),
            render: (_, branch) => (
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-3">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">{branch.name}</div>
                </div>
            ),
        },
        {
            key: 'address',
            title: t('address', 'Adres'),
            render: (_, branch) => branch.address ? (
                <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{branch.address}</span>
                </div>
            ) : <span className="text-sm text-muted-foreground">-</span>,
        },
        {
            key: 'contact',
            title: t('contact', 'İletişim'),
            render: (_, branch) => (
                <div className="space-y-1 text-sm text-muted-foreground">
                    {branch.phone && (
                        <div className="flex items-center"><Phone className="w-4 h-4 mr-1 text-muted-foreground" />{branch.phone}</div>
                    )}
                    {branch.email && (
                        <div className="flex items-center"><Mail className="w-4 h-4 mr-1 text-muted-foreground" />{branch.email}</div>
                    )}
                    {!branch.phone && !branch.email && '-'}
                </div>
            ),
        },
        {
            key: '_actions',
            title: t('actions', 'İşlemler'),
            align: 'right',
            render: (_, branch) => (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(branch)} className="text-primary mr-2" title="Düzenle">
                        <Pencil className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(branch.id)} className="text-muted-foreground hover:text-destructive" title="Sil">
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <SettingsSectionHeader
                className="mb-6"
                title="Şubeler"
                description="Organizasyonunuza ait şubeleri yönetin"
                icon={<Building2 className="w-6 h-6" />}
                actions={(
                    <Button
                        onClick={openCreateModal}
                        icon={<Plus className="w-5 h-5" />}
                    >
                        Yeni Şube Ekle
                    </Button>
                )}
            />

            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-red-200 text-destructive rounded-2xl flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <DataTable<Branch>
                data={branches}
                columns={branchColumns}
                loading={isLoading}
                rowKey="id"
                emptyText={t('noBranches', 'Henuz sube eklenmemis.')}
            />

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            {editingBranch ? t('editBranch', 'Subeyi Duzenle') : t('addNewBranch', 'Yeni Sube Ekle')}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Input
                                    label="Şube Adı *"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    leftIcon={<Building2 className="w-5 h-5 text-muted-foreground" />}
                                    placeholder="Örn: Merkez Şube"
                                    fullWidth
                                />
                            </div>

                            <div>
                                <Textarea
                                    label="Adres"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Şube adresi"
                                    className="min-h-[80px]"
                                    fullWidth
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Telefon"
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    leftIcon={<Phone className="w-5 h-5 text-muted-foreground" />}
                                    placeholder="0212..."
                                    fullWidth
                                />
                                <Input
                                    label="E-posta"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    leftIcon={<Mail className="w-5 h-5 text-muted-foreground" />}
                                    placeholder="sube@..."
                                    fullWidth
                                />
                            </div>

                            {formError && (
                                <div className="text-sm text-destructive flex items-center p-2 bg-destructive/10 rounded-2xl border border-red-200">
                                    <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    {formError}
                                </div>
                            )}

                            <div className="flex space-x-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1"
                                >
                                    İptal
                                </Button>
                                <Button
                                    type="submit"
                                    loading={isSubmitting}
                                    className="flex-1"
                                >
                                    {editingBranch ? 'Güncelle' : 'Oluştur'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmationModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 transform transition-all">
                        <div className={`flex items-center mb-4 ${confirmationModal.type === 'danger' ? 'text-destructive' :
                            confirmationModal.type === 'warning' ? 'text-amber-500' : 'text-primary'
                            }`}>
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {confirmationModal.title}
                            </h3>
                        </div>

                        <p className="text-muted-foreground mb-6">
                            {confirmationModal.message}
                        </p>

                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                            >
                                İptal
                            </Button>
                            <Button
                                variant={confirmationModal.type === 'danger' ? 'danger' : 'primary'}
                                onClick={confirmationModal.onConfirm}
                            >
                                Onayla
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
