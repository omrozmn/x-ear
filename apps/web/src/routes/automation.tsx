import { createFileRoute } from '@tanstack/react-router'
import AutomationPage from '../pages/AutomationPage'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TanStack Router type generation out of sync
export const Route = createFileRoute('/automation')({
  component: AutomationPage,
})
