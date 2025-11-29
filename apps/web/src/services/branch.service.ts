import { apiClient } from './apiClient';

export interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tenant_id: string;
}

export const branchService = {
    getBranches: async (): Promise<Branch[]> => {
        const response = await apiClient.get<any>('/branches');
        return response.data.data;
    },

    createBranch: async (data: Partial<Branch>): Promise<Branch> => {
        const response = await apiClient.post<any>('/branches', data);
        return response.data.data;
    },

    updateBranch: async (id: string, data: Partial<Branch>): Promise<Branch> => {
        const response = await apiClient.put<any>(`/branches/${id}`, data);
        return response.data.data;
    },

    deleteBranch: async (id: string): Promise<void> => {
        await apiClient.delete(`/branches/${id}`);
    }
};
