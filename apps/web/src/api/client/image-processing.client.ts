/**
 * Image Processing API Client Adapter
 */
export {
  resizeImage,
  removeBackground,
  aiGenerateImage,
  aiEditImage,
  useResizeImage,
  useRemoveBackground,
  useAiGenerateImage,
  useAiEditImage,
} from '@/api/generated/index';

export type {
  ResizeRequest,
  RemoveBgRequest,
  AIGenerateRequest,
  AIEditRequest,
  ImageProcessingResponse,
} from '@/api/generated/schemas';
