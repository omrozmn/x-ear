/**
 * Image Processing API Client
 */
import { customInstance } from '@/api/orval-mutator';
import { useMutation } from '@tanstack/react-query';

export interface ImageProcessingResponse {
  url: string;
  s3Key: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

// API
export const resizeImage = (data: { s3Key: string; width: number; height: number; maintainAspect?: boolean }) =>
  customInstance<{ data: ImageProcessingResponse }>({ url: '/api/image-processing/resize', method: 'POST', data });

export const removeBackground = (data: { s3Key: string }) =>
  customInstance<{ data: ImageProcessingResponse }>({ url: '/api/image-processing/remove-bg', method: 'POST', data });

export const aiGenerateImage = (data: { prompt: string; style?: string; width?: number; height?: number }) =>
  customInstance<{ data: ImageProcessingResponse }>({ url: '/api/image-processing/ai-generate', method: 'POST', data });

export const aiEditImage = (data: { s3Key: string; prompt: string }) =>
  customInstance<{ data: ImageProcessingResponse }>({ url: '/api/image-processing/ai-edit', method: 'POST', data });

// Hooks
export function useResizeImage() {
  return useMutation({ mutationFn: resizeImage });
}

export function useRemoveBackground() {
  return useMutation({ mutationFn: removeBackground });
}

export function useAIGenerateImage() {
  return useMutation({ mutationFn: aiGenerateImage });
}

export function useAIEditImage() {
  return useMutation({ mutationFn: aiEditImage });
}
