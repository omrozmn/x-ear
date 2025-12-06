import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/reports/activity')({
  beforeLoad: () => {
    throw redirect({ to: '/reports', search: { tab: 'activity' } })
  },
})
