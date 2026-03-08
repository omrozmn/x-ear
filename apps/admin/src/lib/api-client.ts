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
import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { adminApi } from '../api/orval-mutator';
import type { UserRead } from '../api/generated/schemas';

export interface PaginationMeta {
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
  hasNext?: boolean;
}

export interface AdminUsersAllParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface AdminUsersAllUser extends UserRead {
  tenant_id?: string;
  tenant_name?: string;
  first_name?: string;
  last_name?: string;
  last_login?: string;
  created_at?: string;
  is_active?: boolean;
}

export interface AdminUsersAllResponse {
  users?: AdminUsersAllUser[];
  pagination?: PaginationMeta;
}

export interface UpdateAdminUserAllPayload {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  password?: string;
  is_active?: boolean;
}

type UnknownRecord = Record<string, unknown>;
type BlogListParams = { page?: number; limit?: number; search?: string; category?: string };
export interface BlogPost extends UnknownRecord {
  id: string;
  title?: string;
  slug?: string;
  category?: string;
  is_published?: boolean;
  published_at?: string | null;
}

export interface BlogListResponse {
  data?: BlogPost[];
  posts?: BlogPost[];
  pagination?: PaginationMeta;
}

type BlogMutationPayload = UnknownRecord;
type ManualQueryOptions<TData> = { query?: UseQueryOptions<TData, Error, TData> };

export const useListAdminUserAll = (
  params?: AdminUsersAllParams,
  options?: ManualQueryOptions<AdminUsersAllResponse>
) => {
  return useQuery({
    queryKey: ['/api/admin/users/all', params],
    queryFn: async () => {
      const response = await adminApi<AdminUsersAllResponse>({ url: '/admin/users/all', method: 'GET', params });
      return response;
    },
    ...options?.query,
  });
};

export const useUpdateAdminUserAll = (
  options?: UseMutationOptions<AdminUsersAllUser, Error, { userId: string; data: UpdateAdminUserAllPayload }>
) => {
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateAdminUserAllPayload }) => {
      const response = await adminApi<AdminUsersAllUser>({
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
  params?: BlogListParams,
  options?: ManualQueryOptions<BlogListResponse | BlogPost[]>
) => {
  return useQuery({
    queryKey: ['/api/admin/blog', params],
    queryFn: async () => {
      const response = await adminApi<BlogListResponse | BlogPost[]>({ url: '/admin/blog/', method: 'GET', params });
      return response;
    },
    ...options?.query,
  });
};

export const useCreateAdminPost = (options?: UseMutationOptions<BlogPost, Error, BlogMutationPayload>) => {
  return useMutation({
    mutationFn: async (data: BlogMutationPayload) => {
      const response = await adminApi<BlogPost>({ url: '/admin/blog/', method: 'POST', data });
      return response;
    },
    ...options,
  });
};

export const useUpdateAdminPost = (
  options?: UseMutationOptions<BlogPost, Error, { postId: string; data: BlogMutationPayload }>
) => {
  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: BlogMutationPayload }) => {
      const response = await adminApi<BlogPost>({ url: `/admin/blog/${postId}`, method: 'PUT', data });
      return response;
    },
    ...options,
  });
};

export const useDeleteAdminPost = (options?: UseMutationOptions<unknown, Error, string>) => {
  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await adminApi<unknown>({ url: `/admin/blog/${postId}`, method: 'DELETE' });
      return response;
    },
    ...options,
  });
};
