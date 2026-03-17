import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/personnel')({
    beforeLoad: () => {
        throw redirect({ to: '/tenants' })
    },
})
