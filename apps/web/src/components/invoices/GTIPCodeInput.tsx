import { Input } from '@x-ear/ui-web';
import { useState } from 'react';

interface GTIPCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}

/**
 * GTİP (Gümrük Tarife İstatistik Pozisyonu) Kodu Input Component
 * 
 * GTİP kodu 8 haneli bir koddur ve ihracat faturalarında zorunludur.
 * Format: 12345678 (8 rakam)
 */
export function GTIPCodeInput({
    value,
    onChange,
    error,
    required = false,
    disabled = false
}: GTIPCodeInputProps) {
    const [localError, setLocalError] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Sadece rakam girişine izin ver
        const numericValue = newValue.replace(/\D/g, '');

        // Maksimum 8 hane
        const limitedValue = numericValue.slice(0, 8);

        onChange(limitedValue);

        // Validasyon
        if (limitedValue && limitedValue.length !== 8) {
            setLocalError('GTİP kodu 8 haneli olmalıdır');
        } else {
            setLocalError('');
        }
    };

    const handleBlur = () => {
        // Blur olduğunda final validasyon
        if (required && !value) {
            setLocalError('GTİP kodu zorunludur');
        } else if (value && value.length !== 8) {
            setLocalError('GTİP kodu 8 haneli olmalıdır');
        } else {
            setLocalError('');
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <Input
                type="text"
                label="GTİP Kodu"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="12345678"
                error={displayError}
                disabled={disabled}
                fullWidth
                required={required}
                maxLength={8}
            />
            <div className="mt-1 flex items-start justify-between">
                <p className="text-xs text-gray-500">
                    Gümrük Tarife İstatistik Pozisyonu (8 haneli)
                </p>
                {value && (
                    <span className={`text-xs ${value.length === 8 ? 'text-green-600' : 'text-amber-600'}`}>
                        {value.length}/8
                    </span>
                )}
            </div>

            {/* GTİP Kodu Bilgilendirme */}
            {required && !value && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                    <p className="text-xs text-amber-700">
                        İhracat faturalarında GTİP kodu zorunludur
                    </p>
                </div>
            )}

            {/* Geçerli GTİP Kodu Göstergesi */}
            {value && value.length === 8 && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                    <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <p className="text-xs text-green-700">
                            Geçerli GTİP kodu: <strong>{value}</strong>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
