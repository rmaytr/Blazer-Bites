import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button, EmptyState } from '@/components/ui'

/** Shown when a page throws or its chunk fails to load (often after a deploy: reloading fixes it). */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <div className="mx-auto max-w-lg p-4 pt-8">
      <EmptyState
        title={notFound ? 'Page not found' : 'Something went wrong'}
        body={notFound ? 'That link may be old.' : 'Reload to get the latest version of the app.'}
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    </div>
  )
}

export function PageFallback() {
  return <div aria-busy="true" aria-label="Loading" className="min-h-dvh" />
}
