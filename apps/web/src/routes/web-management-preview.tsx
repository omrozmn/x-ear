import { createFileRoute } from '@tanstack/react-router';
import WebsiteBuilderPreviewPage from '../pages/WebsiteBuilderPreviewPage';

export const Route = createFileRoute('/web-management-preview')({
  component: WebsiteBuilderPreviewPage,
});
