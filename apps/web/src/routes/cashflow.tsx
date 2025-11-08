import { createFileRoute } from '@tanstack/react-router';
import { CashflowPage } from '../pages/CashflowPage';

export const Route = createFileRoute('/cashflow')({
  component: CashflowPage,
});
