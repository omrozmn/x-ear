/**
 * API Client - Central export point for all Orval-generated API hooks
 * 
 * Bu dosya api/generated'dan re-export yapar.
 * 
 * Yeni alias eklemek için: api-aliases.json dosyasını düzenleyin
 * Yeniden üretmek için: npm run gen:api
 */

// Re-export everything from auto-generated API
export * from '../api/generated';
export { AxiosError } from 'axios';

// Export adminApi for direct usage
export { adminApi } from '../api/orval-mutator';

// Temporary manual hooks until OpenAPI is regenerated
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { adminApi } from '../api/orval-mutator';

export const useListAdminUserAll = (
  params?: { page?: number; per_page?: number; search?: string; role?: string; status?: string },
  options?: { query?: UseQueryOptions<any> }
) => {
  return useQuery({
    queryKey: ['/api/admin/users/all', params],
    queryFn: async () => {
      const response = await adminApi({ url: '/admin/users/all', method: 'GET', params });
      return response;
    },
    ...options?.query,
  });
};

export const useUpdateAdminUserAll = (options?: UseMutationOptions<any, any, { userId: string; data: any }>) => {
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await adminApi({
        url: `/admin/users/all/${userId}`,
        method: 'PUT',
        data
      });
      return response;
    },
    ...options,
  });
};

export const useListAdminPosts = (
  params?: { page?: number; limit?: number; search?: string; category?: string },
  options?: { query?: UseQueryOptions<any> }
) => {
  return useQuery({
    queryKey: ['/api/admin/blog', params],
    queryFn: async () => {
      const response = await adminApi({ url: '/admin/blog/', method: 'GET', params });
      return response;
    },
    ...options?.query,
  });
};

export const useCreateAdminPost = (options?: UseMutationOptions<any, any, any>) => {
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await adminApi({ url: '/admin/blog/', method: 'POST', data });
      return response;
    },
    ...options,
  });
};

export const useUpdateAdminPost = (options?: UseMutationOptions<any, any, { postId: string; data: any }>) => {
  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: any }) => {
      const response = await adminApi({ url: `/admin/blog/${postId}`, method: 'PUT', data });
      return response;
    },
    ...options,
  });
};

export const useDeleteAdminPost = (options?: UseMutationOptions<any, any, string>) => {
  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await adminApi({ url: `/admin/blog/${postId}`, method: 'DELETE' });
      return response;
    },
    ...options,
  });
};
