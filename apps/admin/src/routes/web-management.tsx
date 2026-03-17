import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/web-management')({
    beforeLoad: () => {
        throw redirect({ to: '/blog' })
    },
})
