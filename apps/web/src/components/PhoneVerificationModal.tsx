import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '@x-ear/ui-web';
import { Modal } from './ui/Modal';
import { Phone } from 'lucide-react';
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
        const isAdminUser = user?.role === 'super_admin' || user?.role === 'support' || user?.role === 'finance' || user?.role === 'content';
        
        if (isAuthenticated && user && !isAdminUser && !user.isPhoneVerified) {
            setIsOpen(true);
            if (!user.phone) {
                setStep('phone');
            } else {
                setStep('otp');
                setPhoneNumber(user.phone);
            }
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
        } catch (error: any) {
            toast.error(error.message || 'Kod gönderilemedi');
        } finally {
            setIsLoading(false);
        }
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
        } catch (error: any) {
            toast.error(error.message || 'Doğrulama başarısız');
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
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-center text-gray-600">
                    Hesabınızın güvenliği için telefon numaranızı doğrulamanız gerekmektedir.
                </p>
            </div>

            <div className="space-y-4 mb-6">
                {step === 'phone' ? (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Telefon Numarası
                        </label>
                        <Input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="5XX XXX XX XX"
                            disabled={isLoading}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Doğrulama Kodu
                            </label>
                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                placeholder="XXXXXX"
                                maxLength={6}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center tracking-widest text-lg"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-center text-gray-500">
                                {phoneNumber} numaralı telefona gönderilen kodu giriniz.
                            </p>
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
                        {!user?.phone && (
                            <Button
                                variant="ghost"
                                onClick={() => setStep('phone')}
                                disabled={isLoading}
                                className="w-full text-xs text-gray-400"
                            >
                                Numarayı Değiştir
                            </Button>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};
