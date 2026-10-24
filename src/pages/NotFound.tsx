import { Link } from 'react-router'
import { EmptyState, PageHeader, buttonClasses } from '@/components/ui'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="Nothing here"
        body="That link may be old. The carts are one tap away."
        action={
          <Link to="/" className={buttonClasses('primary')}>
            See the carts
          </Link>
        }
      />
    </>
  )
}
