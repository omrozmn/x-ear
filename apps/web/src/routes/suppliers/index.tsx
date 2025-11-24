import { createFileRoute } from '@tanstack/react-router';
import SuppliersPage from '../../pages/SuppliersPage';

export const Route = createFileRoute('/suppliers/')({
  component: SuppliersPage,
});