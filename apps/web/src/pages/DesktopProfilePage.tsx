import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@x-ear/ui-web';
import { User, Mail, Shield, Key, Save, Phone, Eye, EyeOff, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateUsername } from '../utils/stringUtils';
import {
    useListUserMe,
    useUpdateUserMe,
    useCreateUserMePassword
} from '@/api/generated';


export const DesktopProfilePage: React.FC = () => {


    const { user, setUser, verifyOtp, sendOtp } = useAuthStore();

    // 1. ALL HOOKS MUST BE AT THE TOP (No exceptions for early returns)

    // Form states
    const [firstName, setFirstName] = useState(() => {
        if (user?.name) {
            const parts = user.name.split(' ');
            return parts[0];
        }
        return '';
    });
    const [lastName, setLastName] = useState(() => {
        if (user?.name) {
            const parts = user.name.split(' ');
            return parts.slice(1).join(' ');
        }
        return '';
    });
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Phone verification states
    const [phone, setPhone] = useState(user?.phone || '');
    const [otpCode, setOtpCode] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);

    // API Hooks (Query & Mutations)
    const { data: userDataResponse, isError, isLoading, error } = useListUserMe({
        query: {
            retry: 1,
            refetchOnWindowFocus: false
        }
    });

    // DEBUG: Log the API call state
    React.useEffect(() => {
        console.log('[DesktopProfilePage] useUsersGetCurrentUser state:', {
            isLoading,
            isError,
            hasData: !!userDataResponse,
            error: error ? {
                message: (error as any).message,
                response: (error as any).response,
                status: (error as any).response?.status
            } : null
        });
    }, [isLoading, isError, userDataResponse, error]);

    const updateMeMutation = useUpdateUserMe({
        mutation: {
            onSuccess: (data: any) => {
                toast.success('Profil bilgileri güncellendi');
                const updatedUser = data?.data || data;
                if (updatedUser) {
                    setUser({
                        ...user!,
                        ...updatedUser,
                    } as any);
                }
            },
            onError: () => {
                toast.error('Güncelleme başarısız');
            }
        }
    });

    const changePasswordMutation = useCreateUserMePassword({
        mutation: {
            onSuccess: () => {
                toast.success('Şifre başarıyla değiştirildi');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            },
            onError: (error: any) => {
                const status = error.response?.status;
                if (status === 403 || status === 401) {
                    toast.error('Mevcut şifreniz hatalı.');
                } else {
                    toast.error(error.response?.data?.error || 'Şifre değiştirilemedi');
                }
            }
        }
    });

    // Data synchronization effect
    React.useEffect(() => {
        const responseData = userDataResponse as any;
        const freshUser = responseData?.data || responseData;

        if (freshUser && (freshUser.id || freshUser.email)) {
            // Update Global Store
            if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
                setUser({
                    ...user!,
                    ...freshUser,
                    name: freshUser.fullName || freshUser.firstName || user?.name || '',
                } as any);
            }

            // Sync Local Form State
            if (freshUser.fullName) {
                const parts = freshUser.fullName.split(' ');
                setFirstName(parts[0]);
                setLastName(parts.slice(1).join(' '));
            } else if (freshUser.firstName) {
                setFirstName(freshUser.firstName);
                setLastName(freshUser.lastName || '');
            }

            if (freshUser.username) setUsername(freshUser.username);
            if (freshUser.email) setEmail(freshUser.email);
            if (freshUser.phone) setPhone(freshUser.phone);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userDataResponse, setUser]);

    // 2. CONDITIONAL RETURNS FOR UI STATE (After all hooks)

    // Show loading spinner while fetching
    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Profil yükleniyor...</p>
            </div>
        </div>
    );

    // Show error if fetch failed
    if (isError) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <p className="text-red-600 mb-4">Profil bilgileri yüklenemedi</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Tekrar Dene
                </button>
            </div>
        </div>
    );

    const handleSendVerification = async () => {
        if (!phone) return;
        try {
            setIsVerifyingPhone(true);
            await sendOtp(phone);
            setShowOtpInput(true);
            toast.success('Doğrulama kodu gönderildi');
        } catch (error: any) {
            toast.error(error.message || 'Kod gönderilemedi');
        } finally {
            setIsVerifyingPhone(false);
        }
    };

    const handleVerify = async () => {
        if (!otpCode) return;
        try {
            setIsVerifyingPhone(true);
            await verifyOtp(otpCode);
            toast.success('Telefon numarası doğrulandı');
            setShowOtpInput(false);
            setOtpCode('');
            setIsEditingPhone(false);
        } catch (error: any) {
            toast.error(error.message || 'Doğrulama başarısız');
        } finally {
            setIsVerifyingPhone(false);
        }
    };

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateMeMutation.mutate({
            data: {
                firstName,
                lastName,
                username,
                email
            } as any
        });
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Yeni şifreler eşleşmiyor');
            return;
        }

        changePasswordMutation.mutate({
            data: {
                currentPassword,
                newPassword
            }
        });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil Ayarları</h1>
                <p className="text-gray-500 dark:text-gray-400">Kişisel bilgilerinizi ve hesap güvenliğinizi yönetin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Kişisel Bilgiler
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Kullanıcı Adı
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="pl-10"
                                        placeholder="Kullanıcı Adı"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Ad
                                    </label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setFirstName(newVal);
                                            // Optional: only auto-update if username matches previous pattern? 
                                            // The requirement implies explicit auto-fill: "girilen isim ve soyisim ile ... otomatik olarak ... doldur"
                                            // We will update it.
                                            setUsername(generateUsername(newVal, lastName));
                                        }}
                                        placeholder="Adınız"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Soyad
                                    </label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setLastName(newVal);
                                            setUsername(generateUsername(firstName, newVal));
                                        }}
                                        placeholder="Soyadınız"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    E-posta Adresi
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        placeholder="ornek@email.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Rol
                                </label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={user?.role || 'Kullanıcı'}
                                        disabled
                                        className="pl-10 bg-gray-50 dark:bg-gray-800 capitalize"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" disabled={updateMeMutation.isPending} className="w-full">
                                    <Save className="w-4 h-4 mr-2" />
                                    {updateMeMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Contact Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="w-5 h-5" />
                                İletişim Bilgileri
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Telefon Numarası
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="pl-10"
                                                placeholder="5XX XXX XX XX"
                                                disabled={user?.isPhoneVerified && !isEditingPhone}
                                            />
                                        </div>
                                        {user?.isPhoneVerified && !isEditingPhone ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsEditingPhone(true);
                                                    setShowOtpInput(false);
                                                }}
                                                className="px-3"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleSendVerification}
                                                disabled={isVerifyingPhone || !phone}
                                            >
                                                {showOtpInput ? 'Tekrar Gönder' : 'Doğrula'}
                                            </Button>
                                        )}
                                    </div>
                                    {user?.isPhoneVerified && !isEditingPhone && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-xs text-green-600 font-medium">Numaranız doğrulanmış</span>
                                        </div>
                                    )}
                                </div>

                                {(showOtpInput || isEditingPhone) && (
                                    <div className="space-y-2 pt-2 border-t">
                                        {showOtpInput && (
                                            <>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Doğrulama Kodu
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={otpCode}
                                                        onChange={(e) => setOtpCode(e.target.value)}
                                                        placeholder="XXXXXX"
                                                        maxLength={6}
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center tracking-widest text-lg"
                                                    />
                                                    <Button
                                                        onClick={handleVerify}
                                                        disabled={otpCode.length < 6 || isVerifyingPhone}
                                                    >
                                                        Onayla
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-gray-500">Telefonunuza gönderilen 6 haneli kodu giriniz.</p>
                                            </>
                                        )}
                                        {isEditingPhone && !showOtpInput && (
                                            <p className="text-xs text-gray-500">Yeni numaranızı girdikten sonra 'Doğrula' butonuna basınız.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Password Change Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Şifre Değiştir
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Mevcut Şifre
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Yeni Şifre
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Yeni Şifre (Tekrar)
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        {showPassword ? 'Şifreleri Gizle' : 'Şifreleri Göster'}
                                    </button>
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" variant="outline" disabled={changePasswordMutation.isPending} className="w-full">
                                        {changePasswordMutation.isPending ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};


