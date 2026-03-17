import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/suppliers')({
    beforeLoad: () => {
        throw redirect({ to: '/inventory' })
    },
})
