import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, useToastHelpers } from '@x-ear/ui-web';
import {
  useCreatePaymentPoPaytrInitiate,
  useCreatePoCommissionInstallmentOptions,
} from '@/api/client/payments.client';
import { CreditCard, AlertTriangle, ShieldCheck, Check, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { useHaptic } from '@/hooks/useHaptic';
import { useTranslation } from 'react-i18next';

interface InitPaymentPayload {
  amount: number;
  installment_count: number;
  description: string;
  sale_id: string | null;
  party_id: string | null;
}

interface InstallmentPayload {
  amount: number;
}

interface InstallmentOption {
  installment_count: number;
  label: string;
  total: number;
  installment_amount: number;
  net_amount: number;
  gross_amount: number;
  commission_amount: number;
  commission_rate: number;
  monthly_payment: number;
}

export const MobilePosPage: React.FC = () => {
  const { t } = useTranslation(['finance', 'common']);
  const { triggerSelection } = useHaptic();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState<number>(1);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [, setSelectedPartyName] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);
  const { success } = useToastHelpers();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { amount: '', description: '', partyName: '' },
  });

  const amount = watch('amount');
  const { mutate: initiatePayment, isPending } = useCreatePaymentPoPaytrInitiate();
  const { mutate: getInstallments, isPending: loadingInstallments } = useCreatePoCommissionInstallmentOptions();

  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (numAmount && numAmount > 0) {
      const payload: InstallmentPayload = { amount: numAmount };
      getInstallments({ data: payload }, {
        onSuccess: (response: unknown) => {
          const responseData = response as { data?: { options?: InstallmentOption[] } };
          const options = responseData?.data?.options || [];
          setInstallmentOptions(options);
          if (options.length > 0) setSelectedInstallment(options[0].installment_count || 1);
        },
        onError: () => {
          setInstallmentOptions([{
            installment_count: 1, label: t('pos.single_installment'), total: numAmount,
            installment_amount: numAmount, net_amount: numAmount, gross_amount: numAmount,
            commission_amount: 0, commission_rate: 0, monthly_payment: numAmount,
          }]);
          setSelectedInstallment(1);
        },
      });
    } else {
      setInstallmentOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, getInstallments]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'POS_PAYMENT_SUCCESS') {
          setResult('success');
          setIframeUrl(null);
          success(t('pos.payment_success'));
        } else if (event.data?.type === 'POS_PAYMENT_FAILED') {
          setResult('fail');
          setErrorMessage(event.data?.message || t('pos.payment_failed'));
          setIframeUrl(null);
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  const onSubmit = (data: { amount: string; partyName: string; description: string }) => {
    setErrorMessage(null);
    setResult(null);
    triggerSelection();

    const payload: InitPaymentPayload = {
      amount: parseFloat(data.amount),
      installment_count: selectedInstallment,
      description: `${data.partyName || 'Anonim'} - ${data.description || 'Hızlı tahsilat'}`,
      sale_id: null,
      party_id: selectedPartyId,
    };

    initiatePayment({ data: payload }, {
      onSuccess: (response: unknown) => {
        const responseData = response as { data: { success: boolean; iframe_url?: string; error?: string } };
        if (responseData.data.success && responseData.data.iframe_url) {
          setIframeUrl(responseData.data.iframe_url);
        } else {
          setErrorMessage(responseData.data.error || t('pos.payment_init_failed'));
        }
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { error?: string } }; message?: string };
        setErrorMessage(error.response?.data?.error || error.message || t('common.error_occurred'));
      },
    });
  };

  if (iframeUrl) {
    return (
      <MobileLayout showBottomNav={false}>
        <MobileHeader title={t('pos.secure_payment_title')} onBack={() => setIframeUrl(null)} />
        <div className="flex-1 h-[calc(100vh-56px)]">
          <iframe src={iframeUrl} className="w-full h-full" frameBorder="0" scrolling="yes" id="paytriframe" />
        </div>
      </MobileLayout>
    );
  }

  const selectedOption = installmentOptions.find(opt => opt.installment_count === selectedInstallment);

  return (
    <MobileLayout>
      <MobileHeader title={t('pos.title')} showBack={false} />

      <div className="p-4 space-y-4 pb-28 min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-950">
        {result === 'success' && (
          <div className="bg-success/10 border border-green-200 dark:border-green-800 p-4 rounded-2xl flex items-center gap-3 text-success">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">{t('pos.payment_success_title')}</p>
              <p className="text-xs">{t('pos.payment_success_desc')}</p>
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => {
              setResult(null);
              setValue('amount', '');
              setValue('description', '');
              setValue('partyName', '');
              setSelectedPartyId(null);
              setSelectedPartyName('');
              setInstallmentOptions([]);
            }}>
              {t('pos.new_transaction')}
            </Button>
          </div>
        )}

        {errorMessage && (
          <div className="bg-destructive/10 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{t('pos.error_title')}</p>
              <p className="text-xs">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount Input */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-5">
            <label className="text-sm font-medium text-foreground mb-3 block text-center">
              {t('pos.amount_label')}
            </label>
            <div className="relative max-w-xs mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-blue-900 dark:text-blue-200">₺</span>
              <input
                data-allow-raw="true"
                type="number"
                step="0.01"
                {...register('amount', {
                  required: t('pos.amount_required'),
                  min: { value: 1, message: t('pos.amount_min') },
                })}
                className="w-full bg-primary/10 border-2 border-blue-200 dark:border-blue-700 rounded-2xl py-4 pl-10 pr-4 text-2xl font-bold text-blue-900 dark:text-blue-100 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-400 outline-none text-center transition-all"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-destructive text-xs mt-2 text-center">{errors.amount.message as string}</p>}
          </div>

          {/* Customer & Description */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('pos.customer_name_optional')}
              </label>
              <Input
                {...register('partyName')}
                placeholder={t('pos.customer_name_placeholder')}
                className="h-11 bg-gray-50 dark:bg-gray-800 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('pos.note_desc')}
              </label>
              <Input
                {...register('description')}
                placeholder={t('pos.note_placeholder')}
                className="h-11 bg-gray-50 dark:bg-gray-800 rounded-xl"
              />
            </div>
          </div>

          {/* Installment Options */}
          {installmentOptions.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-4">
              <label className="block text-sm font-medium text-foreground mb-3">
                {t('pos.installment_options')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {installmentOptions.map((option) => (
                  <button
                    data-allow-raw="true"
                    key={option.installment_count}
                    type="button"
                    onClick={() => { setSelectedInstallment(option.installment_count); triggerSelection(); }}
                    className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                      selectedInstallment === option.installment_count
                        ? 'border-blue-600 dark:border-blue-500 bg-primary/10'
                        : 'border-border bg-white dark:bg-gray-800'
                    }`}
                  >
                    {selectedInstallment === option.installment_count && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{option.label}</div>
                    {option.installment_count > 1 && option.monthly_payment && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {option.monthly_payment?.toFixed(2)} ₺ x {option.installment_count}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                      <TrendingDown className="w-3 h-3" />
                      %{option.commission_rate}
                    </div>
                    <div className="text-xs font-bold text-success mt-1">
                      →{option.net_amount?.toFixed(2) ?? '0.00'} ₺
                    </div>
                  </button>
                ))}
              </div>
              {loadingInstallments && (
                <p className="text-center text-xs text-muted-foreground mt-2">{t('pos.calculating')}</p>
              )}
            </div>
          )}

          {/* Summary */}
          {selectedOption && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl border-2 border-green-200 dark:border-green-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-muted-foreground">{t('pos.collected_from_customer')}:</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedOption.gross_amount?.toFixed(2) ?? '0.00'} ₺
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">{t('pos.commission')}:</div>
                  <div className="text-base font-bold text-destructive">
                    -{selectedOption.commission_amount?.toFixed(2) ?? '0.00'} ₺
                  </div>
                </div>
              </div>
              <div className="border-t border-green-300 dark:border-green-700 my-2" />
              <div>
                <div className="text-[10px] text-muted-foreground">{t('pos.net_to_account')}:</div>
                <div className="text-xl font-bold text-success">
                  {selectedOption.net_amount?.toFixed(2) ?? '0.00'} ₺
                </div>
              </div>
            </div>
          )}

          {/* Info Section (Collapsible) */}
          <button
            data-allow-raw="true"
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="w-full flex items-center justify-between bg-primary/10 border border-blue-100 dark:border-blue-800 rounded-xl p-3"
          >
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">{t('pos.info_title')}</span>
            {showInfo ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
          </button>
          {showInfo && (
            <div className="bg-primary/10 border border-blue-100 dark:border-blue-800 rounded-xl p-3 -mt-2">
              <p className="text-xs text-blue-800 dark:text-blue-200">{t('pos.info_desc')}</p>
            </div>
          )}
        </form>
      </div>

      {/* Fixed Bottom Submit */}
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Button
          type="submit"
          onClick={handleSubmit(onSubmit)}
          className="w-full h-12 text-base font-medium shadow-lg rounded-2xl"
          disabled={isPending || !amount || !installmentOptions.length}
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {isPending ? t('pos.starting') : t('pos.start_payment_btn')}
        </Button>
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground mt-2">
          <ShieldCheck className="w-3 h-3 text-success" />
          <span>{t('pos.ssl_secure')}</span>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobilePosPage;
