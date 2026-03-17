import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/production')({
    beforeLoad: () => {
        throw redirect({ to: '/inventory' })
    },
})
