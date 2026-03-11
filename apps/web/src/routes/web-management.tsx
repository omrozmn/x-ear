import { createFileRoute } from '@tanstack/react-router';
import WebsiteBuilderPage from '../pages/WebsiteBuilderPage';

export const Route = createFileRoute('/web-management')({
  component: WebsiteBuilderPage,
});
