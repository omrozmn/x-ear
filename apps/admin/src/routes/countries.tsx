import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/countries')({
    beforeLoad: () => {
        throw redirect({ to: '/features' })
    },
})
