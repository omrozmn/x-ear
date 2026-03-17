import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '@x-ear/ui-web';
import { Modal } from './ui/Modal';
import { Pencil, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PhoneVerificationModal: React.FC = () => {
    const { user, isAuthenticated, verifyOtp, sendOtp } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'phone' | 'otp'>('otp');

    useEffect(() => {
        // Show modal if user is authenticated but phone is not verified
        // Skip for admin users (they don't have phone verification)
        const isAdminUser = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'admin' || user?.role === 'ADMIN' || user?.role === 'support' || user?.role === 'finance' || user?.role === 'content';

        if (isAuthenticated && user && !isAdminUser && !user.isPhoneVerified) {
            setIsOpen(true);
            setStep('phone');
            setPhoneNumber(user.phone || '');
        } else {
            setIsOpen(false);
        }
    }, [isAuthenticated, user]);

    const handleSendOtp = async () => {
        if (!phoneNumber && step === 'phone') {
            toast.error('Lütfen telefon numarası giriniz');
            return;
        }

        try {
            setIsLoading(true);
            await sendOtp(phoneNumber);
            setStep('otp');
            toast.success('Doğrulama kodu gönderildi');
        } catch (error: unknown) {
            const err = error as { message?: string };
            toast.error(err.message || 'Kod gönderilemedi');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditPhone = () => {
        setOtpCode('');
        setStep('phone');
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 6) {
            toast.error('Lütfen 6 haneli kodu giriniz');
            return;
        }

        try {
            setIsLoading(true);
            await verifyOtp(otpCode, phoneNumber);
            toast.success('Telefon numarası başarıyla doğrulandı');
            setIsOpen(false);
        } catch (error: unknown) {
            const err = error as { message?: string };
            toast.error(err.message || 'Doğrulama başarısız');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            open={isOpen}
            onClose={() => { }}
            title="Telefon Doğrulama"
            size="sm"
            showCloseButton={false}
            closeOnOverlayClick={false}
        >
            <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6 text-primary" />
                </div>
                <p className="text-center text-muted-foreground">
                    Hesabınızın güvenliği için telefon numaranızı doğrulamanız gerekmektedir.
                </p>
            </div>

            <div className="space-y-4 mb-6">
                {step === 'phone' ? (
                    <div className="rounded-2xl border border-border bg-gray-50 p-4 text-center dark:bg-gray-800/60">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Telefon Numarası
                        </p>
                        <div className="mx-auto mt-3 max-w-[280px]">
                            <Input
                                type="tel"
                                inputMode="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="5XX XXX XX XX"
                                disabled={isLoading}
                                className="h-14 text-center text-lg font-medium"
                                fullWidth
                            />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Kodu bu numaraya göndereceğiz. Numara yanlışsa burada düzeltebilirsiniz.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-gray-50 p-4 text-center dark:bg-gray-800/60">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                Doğrulama Kodu
                            </p>
                            <div className="mx-auto mt-3 max-w-[220px]">
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="h-14 text-center text-2xl font-semibold tracking-[0.55em] [text-indent:0.55em]"
                                    disabled={isLoading}
                                    fullWidth
                                />
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{phoneNumber}</span> numaralı telefona gönderilen kodu giriniz.
                            </p>
                        </div>

                        <div className="space-y-2 text-center">
                            <p className="text-xs text-muted-foreground">
                                Numara hatalıysa değiştirip yeni doğrulama kodu gönderebilirsiniz.
                            </p>
                            <Button
                                variant="ghost"
                                onClick={handleEditPhone}
                                disabled={isLoading}
                                className="mx-auto inline-flex w-auto items-center gap-2 text-sm"
                            >
                                <Pencil className="h-4 w-4" />
                                Telefon Numarasını Değiştir
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {step === 'phone' ? (
                    <Button onClick={handleSendOtp} disabled={isLoading || !phoneNumber} className="w-full">
                        {isLoading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
                    </Button>
                ) : (
                    <>
                        <Button onClick={handleVerifyOtp} disabled={isLoading || otpCode.length < 6} className="w-full">
                            {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleSendOtp}
                            disabled={isLoading}
                            className="w-full text-sm"
                        >
                            Kodu Tekrar Gönder
                        </Button>
                    </>
                )}
            </div>
        </Modal>
    );
};
