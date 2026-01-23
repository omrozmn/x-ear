import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Pencil, AlertCircle, AlertTriangle, MapPin, Phone, Mail } from 'lucide-react';
import { branchService, Branch } from '../../services/branch.service';
import { Button, Input, Textarea } from '@x-ear/ui-web';
import toast from 'react-hot-toast';

interface ConfirmationModal {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
}

export function BranchesTab() {
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
        } catch (error: any) {
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
        } catch (err: any) {
            // Handle error object - extract message string
            const errorData = err.response?.data?.error;
            const msg = typeof errorData === 'object' && errorData?.message
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
            title: 'Subeyi Sil',
            message: 'Bu subeyi silmek istediginize emin misiniz? Bu islem geri alinamaz.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await branchService.deleteBranch(id);
                    toast.success('Sube silindi');
                    fetchBranches();
                } catch (err: any) {
                    const errorData = err.response?.data?.error;
                    const msg = typeof errorData === 'object' && errorData?.message
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

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subeler</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organizasyonunuza ait subeleri yonetin</p>
                </div>
                <Button
                    onClick={openCreateModal}
                    icon={<Plus className="w-5 h-5" />}
                >
                    Yeni Şube Ekle
                </Button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sube Adi</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Adres</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Iletisim</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Islemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Yukleniyor...</td>
                            </tr>
                        ) : branches.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Henuz sube eklenmemis.</td>
                            </tr>
                        ) : (
                            branches.map((branch) => (
                                <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-3">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {branch.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {branch.address ? (
                                            <div className="flex items-center">
                                                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                                <span className="truncate max-w-[200px]">{branch.address}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="space-y-1">
                                            {branch.phone && (
                                                <div className="flex items-center">
                                                    <Phone className="w-4 h-4 mr-1 text-gray-400" />
                                                    {branch.phone}
                                                </div>
                                            )}
                                            {branch.email && (
                                                <div className="flex items-center">
                                                    <Mail className="w-4 h-4 mr-1 text-gray-400" />
                                                    {branch.email}
                                                </div>
                                            )}
                                            {!branch.phone && !branch.email && '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditModal(branch)}
                                            className="text-blue-600 mr-2"
                                            title="Düzenle"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(branch.id)}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Sil"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            {editingBranch ? 'Subeyi Duzenle' : 'Yeni Sube Ekle'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Input
                                    label="Şube Adı *"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    leftIcon={<Building2 className="w-5 h-5 text-gray-400" />}
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
                                    leftIcon={<Phone className="w-5 h-5 text-gray-400" />}
                                    placeholder="0212..."
                                    fullWidth
                                />
                                <Input
                                    label="E-posta"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    leftIcon={<Mail className="w-5 h-5 text-gray-400" />}
                                    placeholder="sube@..."
                                    fullWidth
                                />
                            </div>

                            {formError && (
                                <div className="text-sm text-red-600 flex items-center p-2 bg-red-50 rounded-lg border border-red-200">
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
                        <div className={`flex items-center mb-4 ${confirmationModal.type === 'danger' ? 'text-red-600' :
                            confirmationModal.type === 'warning' ? 'text-amber-500' : 'text-blue-600'
                            }`}>
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {confirmationModal.title}
                            </h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-6">
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
