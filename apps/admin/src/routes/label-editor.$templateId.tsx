import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const LabelEditorPage = lazy(() => import('../pages/admin/label-editor/LabelEditorPage'))

export const Route = createFileRoute('/label-editor/$templateId')({
    component: LabelEditorWrapper,
})

function LabelEditorWrapper() {
    const { templateId } = Route.useParams()
    return (
        <Suspense fallback={<PageLoadingFallback />}>
            <LabelEditorPage templateId={templateId} />
        </Suspense>
    )
}
