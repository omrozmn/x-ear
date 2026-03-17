import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/affiliates')({
    beforeLoad: () => {
        throw redirect({ to: '/tenants' })
    },
})
