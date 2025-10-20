import { createFileRoute } from '@tanstack/react-router';
import UTSPage from '@/pages/uts/UTSPage';

export const Route = createFileRoute('/uts')({
  component: UTSPage,
});

export default Route;
