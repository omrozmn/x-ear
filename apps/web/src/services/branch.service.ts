import { customInstance } from '../api/orval-mutator';

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
        const response = await customInstance<{ data: Branch[] }>({
            url: '/api/branches',
            method: 'GET',
        });
        return response.data || [];
    },

    createBranch: async (data: Partial<Branch>): Promise<Branch> => {
        const response = await customInstance<{ data: Branch }>({
            url: '/api/branches',
            method: 'POST',
            data,
        });
        return response.data;
    },

    updateBranch: async (id: string, data: Partial<Branch>): Promise<Branch> => {
        const response = await customInstance<{ data: Branch }>({
            url: `/api/branches/${id}`,
            method: 'PUT',
            data,
        });
        return response.data;
    },

    deleteBranch: async (id: string): Promise<void> => {
        await customInstance({
            url: `/api/branches/${id}`,
            method: 'DELETE',
        });
    }
};
