/**
 * Para Birimi Yönetim Utility
 * 
 * Legacy implementasyona göre bazı senaryo ve fatura tiplerinde
 * para birimi otomatik olarak TRY'ye zorlanır ve değiştirilemez.
 */

export interface CurrencyRestrictions {
  forceTRY: boolean;
  disabled: boolean;
  message?: string;
}

/**
 * Verilen senaryo ve fatura tipine göre para biriminin TRY'ye zorlanması gerekip gerekmediğini kontrol eder
 */
export function shouldForceTRY(scenario?: string, invoiceType?: string): boolean {
  // Kamu senaryosu (7) - TRY zorunlu
  if (scenario === '7' || scenario === 'government') {
    return true;
  }

  // SGK fatura tipi (14) - TRY zorunlu
  if (invoiceType === '14' || invoiceType === 'sgk') {
    return true;
  }

  // Diğer senaryo (36, 4, 2) - TRY zorunlu
  if (scenario === '36' || scenario === '4' || scenario === '2' || scenario === 'other') {
    return true;
  }

  return false;
}

/**
 * Para birimi kısıtlamalarını döndürür
 */
export function getCurrencyRestrictions(
  scenario?: string,
  invoiceType?: string
): CurrencyRestrictions {
  const forceTRY = shouldForceTRY(scenario, invoiceType);

  let message: string | undefined;
  
  if (forceTRY) {
    if (scenario === '7' || scenario === 'government') {
      message = 'Kamu faturalarında para birimi TRY olmalıdır';
    } else if (invoiceType === '14' || invoiceType === 'sgk') {
      message = 'SGK faturalarında para birimi TRY olmalıdır';
    } else {
      message = 'Bu senaryo için para birimi TRY olmalıdır';
    }
  }

  return {
    forceTRY,
    disabled: forceTRY,
    message
  };
}

/**
 * Para birimini otomatik olarak ayarlar
 */
export function getAutoCurrency(
  currentCurrency: string,
  scenario?: string,
  invoiceType?: string
): string {
  const restrictions = getCurrencyRestrictions(scenario, invoiceType);
  
  if (restrictions.forceTRY) {
    return 'TRY';
  }
  
  return currentCurrency;
}

/**
 * Para birimi değişikliğinin geçerli olup olmadığını kontrol eder
 */
export function validateCurrencyChange(
  newCurrency: string,
  scenario?: string,
  invoiceType?: string
): { valid: boolean; error?: string } {
  const restrictions = getCurrencyRestrictions(scenario, invoiceType);
  
  if (restrictions.forceTRY && newCurrency !== 'TRY') {
    return {
      valid: false,
      error: restrictions.message
    };
  }
  
  return { valid: true };
}
