/**
 * Company Service - Tenant company information and assets management
 */
import { customInstance } from '../api/orval-mutator';

export interface CompanyInfo {
  name?: string;
  taxId?: string;
  taxOffice?: string;
  address?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  bankName?: string;
  iban?: string;
  accountHolder?: string;
  sgkMukellefKodu?: string;
  sgkMukellefAdi?: string;
  tradeRegistryNo?: string;
  mersisNo?: string;
}

export interface TenantCompanyResponse {
  id: string;
  name: string;
  companyInfo: CompanyInfo;
  settings: Record<string, unknown>;
}

export interface AssetUploadResponse {
  url: string;
  type: 'logo' | 'stamp' | 'signature';
}

export const companyService = {
  /**
   * Get current tenant's company information
   */
  getCompanyInfo: async (): Promise<TenantCompanyResponse> => {
    const response = await customInstance<{ success: boolean; data: TenantCompanyResponse }>({
      url: '/api/tenant/company',
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Update company information
   */
  updateCompanyInfo: async (data: Partial<CompanyInfo>): Promise<TenantCompanyResponse> => {
    const response = await customInstance<{ success: boolean; data: TenantCompanyResponse }>({
      url: '/api/tenant/company',
      method: 'PUT',
      data,
    });
    return response.data;
  },

  /**
   * Upload company asset (logo, stamp, or signature)
   * @param type - 'logo' | 'stamp' | 'signature'
   * @param file - File object or base64 data string
   */
  uploadAsset: async (type: 'logo' | 'stamp' | 'signature', file: File | string): Promise<AssetUploadResponse> => {
    if (typeof file === 'string') {
      // Base64 upload
      const response = await customInstance<{ success: boolean; data: AssetUploadResponse }>({
        url: `/api/tenant/company/upload/${type}`,
        method: 'POST',
        data: { data: file },
      });
      return response.data;
    } else {
      // FormData upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await customInstance<{ success: boolean; data: AssetUploadResponse }>({
        url: `/api/tenant/company/upload/${type}`,
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
  },

  /**
   * Delete company asset
   */
  deleteAsset: async (type: 'logo' | 'stamp' | 'signature'): Promise<void> => {
    await customInstance({
      url: `/api/tenant/company/upload/${type}`,
      method: 'DELETE',
    });
  },

  /**
   * Get full URL for an asset
   */
  getAssetUrl: (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003';
    // Path already starts with /api/
    return `${baseUrl}${path}`;
  },
};
