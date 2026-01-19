export interface SGKScheme {
  id: string;
  name: string;
  code: string;
  ageLimit?: number;
  maxAmount?: number;
  deductionRate: number;
  bilateralSupport: boolean;
  eligibilityRules: {
    minAge?: number;
    maxAge?: number;
    requiresApproval?: boolean;
    documentRequired?: string[];
  };
}

export interface SGKCalculationInput {
  partyAge: number;
  devicePrice: number;
  isBilateral: boolean;
  schemeId: string;
  hasExistingDevice?: boolean;
  lastDeviceDate?: Date;
}

export interface SGKCalculationResult {
  isEligible: boolean;
  deductionAmount: number;
  partyPayment: number;
  sgkPayment: number;
  reason?: string;
  warnings: string[];
  scheme: SGKScheme;
}

class SGKService {
  private schemes: SGKScheme[] = [
    {
      id: 'sgk-standard',
      name: 'SGK Standart',
      code: 'SGK-STD',
      ageLimit: 65,
      maxAmount: 15000,
      deductionRate: 0.8,
      bilateralSupport: true,
      eligibilityRules: {
        minAge: 18,
        requiresApproval: false,
        documentRequired: ['sgk-card', 'medical-report']
      }
    },
    {
      id: 'sgk-pediatric',
      name: 'SGK Pediatrik',
      code: 'SGK-PED',
      maxAmount: 20000,
      deductionRate: 0.9,
      bilateralSupport: true,
      eligibilityRules: {
        maxAge: 18,
        requiresApproval: true,
        documentRequired: ['sgk-card', 'medical-report', 'parent-consent']
      }
    },
    {
      id: 'sgk-elderly',
      name: 'SGK Yaşlı',
      code: 'SGK-ELD',
      deductionRate: 0.85,
      bilateralSupport: false,
      eligibilityRules: {
        minAge: 65,
        requiresApproval: false,
        documentRequired: ['sgk-card', 'medical-report', 'age-verification']
      }
    },
    {
      id: 'bagkur',
      name: 'Bağ-Kur',
      code: 'BAGKUR',
      maxAmount: 12000,
      deductionRate: 0.75,
      bilateralSupport: true,
      eligibilityRules: {
        minAge: 18,
        requiresApproval: false,
        documentRequired: ['bagkur-card', 'medical-report']
      }
    }
  ];

  getSchemes(): SGKScheme[] {
    return this.schemes;
  }

  getSchemeById(id: string): SGKScheme | null {
    return this.schemes.find(scheme => scheme.id === id) || null;
  }

  getEligibleSchemes(partyAge: number): SGKScheme[] {
    return this.schemes.filter(scheme => {
      const { minAge, maxAge } = scheme.eligibilityRules;
      
      if (minAge && partyAge < minAge) return false;
      if (maxAge && partyAge > maxAge) return false;
      if (scheme.ageLimit && partyAge > scheme.ageLimit) return false;
      
      return true;
    });
  }

  calculateSGKDeduction(input: SGKCalculationInput): SGKCalculationResult {
    const scheme = this.getSchemeById(input.schemeId);
    
    if (!scheme) {
      return {
        isEligible: false,
        deductionAmount: 0,
        partyPayment: input.devicePrice,
        sgkPayment: 0,
        reason: 'Geçersiz SGK şeması',
        warnings: [],
        scheme: {} as SGKScheme
      };
    }

    const warnings: string[] = [];
    let isEligible = true;
    let reason = '';

    // Age eligibility check
    const { minAge, maxAge } = scheme.eligibilityRules;
    if (minAge && input.partyAge < minAge) {
      isEligible = false;
      reason = `Minimum yaş gereksinimi: ${minAge}`;
    }
    if (maxAge && input.partyAge > maxAge) {
      isEligible = false;
      reason = `Maksimum yaş sınırı: ${maxAge}`;
    }
    if (scheme.ageLimit && input.partyAge > scheme.ageLimit) {
      isEligible = false;
      reason = `Yaş sınırı aşıldı: ${scheme.ageLimit}`;
    }

    // Bilateral support check
    if (input.isBilateral && !scheme.bilateralSupport) {
      warnings.push('Bu şema bilateral cihaz desteği sağlamıyor');
    }

    // Existing device check (5 year rule)
    if (input.hasExistingDevice && input.lastDeviceDate) {
      const yearsSinceLastDevice = (Date.now() - input.lastDeviceDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (yearsSinceLastDevice < 5) {
        warnings.push(`Son cihazdan bu yana ${Math.round(yearsSinceLastDevice)} yıl geçti. 5 yıl kuralı nedeniyle kesinti azalabilir.`);
      }
    }

    if (!isEligible) {
      return {
        isEligible: false,
        deductionAmount: 0,
        partyPayment: input.devicePrice,
        sgkPayment: 0,
        reason,
        warnings,
        scheme
      };
    }

    // Calculate deduction
    let baseDeduction = input.devicePrice * scheme.deductionRate;
    
    // Apply maximum amount limit
    if (scheme.maxAmount && baseDeduction > scheme.maxAmount) {
      baseDeduction = scheme.maxAmount;
      warnings.push(`Maksimum kesinti tutarı uygulandı: ${scheme.maxAmount.toLocaleString('tr-TR')} TL`);
    }

    // Bilateral adjustment
    let finalDeduction = baseDeduction;
    if (input.isBilateral && scheme.bilateralSupport) {
      finalDeduction = baseDeduction * 2;
      warnings.push('Bilateral cihaz için kesinti iki katına çıkarıldı');
    }

    // Existing device penalty
    if (input.hasExistingDevice && input.lastDeviceDate) {
      const yearsSinceLastDevice = (Date.now() - input.lastDeviceDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (yearsSinceLastDevice < 5) {
        const penalty = 1 - (yearsSinceLastDevice / 5) * 0.5; // Up to 50% reduction
        finalDeduction *= penalty;
        warnings.push(`5 yıl kuralı nedeniyle kesinti %${Math.round((1-penalty)*100)} azaltıldı`);
      }
    }

    const sgkPayment = Math.round(finalDeduction);
    const partyPayment = Math.round(input.devicePrice - sgkPayment);

    return {
      isEligible: true,
      deductionAmount: sgkPayment,
      partyPayment,
      sgkPayment,
      warnings,
      scheme
    };
  }

  // Real-time pricing preview
  calculatePricing(
    devicePrice: number,
    partyAge: number,
    schemeId?: string,
    isBilateral: boolean = false
  ) {
    if (!schemeId) {
      return {
        originalPrice: devicePrice,
        sgkDeduction: 0,
        finalPrice: devicePrice,
        savings: 0,
        eligibleSchemes: this.getEligibleSchemes(partyAge)
      };
    }

    const calculation = this.calculateSGKDeduction({
      partyAge,
      devicePrice,
      isBilateral,
      schemeId
    });

    return {
      originalPrice: devicePrice,
      sgkDeduction: calculation.sgkPayment,
      finalPrice: calculation.partyPayment,
      savings: calculation.sgkPayment,
      calculation,
      eligibleSchemes: this.getEligibleSchemes(partyAge)
    };
  }

  // Validate required documents
  validateDocuments(schemeId: string, providedDocuments: string[]): {
    isValid: boolean;
    missingDocuments: string[];
    requiredDocuments: string[];
  } {
    const scheme = this.getSchemeById(schemeId);
    if (!scheme) {
      return {
        isValid: false,
        missingDocuments: [],
        requiredDocuments: []
      };
    }

    const required = scheme.eligibilityRules.documentRequired || [];
    const missing = required.filter(doc => !providedDocuments.includes(doc));

    return {
      isValid: missing.length === 0,
      missingDocuments: missing,
      requiredDocuments: required
    };
  }

  // Get document display names
  getDocumentDisplayName(documentCode: string): string {
    const documentNames: Record<string, string> = {
      'sgk-card': 'SGK Kartı',
      'bagkur-card': 'Bağ-Kur Kartı',
      'medical-report': 'Tıbbi Rapor',
      'parent-consent': 'Veli Onayı',
      'age-verification': 'Yaş Doğrulama',
      'approval-document': 'Onay Belgesi'
    };
    return documentNames[documentCode] || documentCode;
  }
}

export const sgkService = new SGKService();
export default sgkService;