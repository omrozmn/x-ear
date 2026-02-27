import { createFileRoute } from '@tanstack/react-router'
import CompanySettings from '../../pages/settings/Company'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TanStack Router type generation out of sync
export const Route = createFileRoute('/settings/')({
  component: CompanySettings,
})
