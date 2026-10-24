import { Link, useParams } from 'react-router'
import { useOrderByToken } from '@/hooks'
import { EmptyState, PageHeader, Skeleton, buttonClasses } from '@/components/ui'
import { RateDish } from '@/features/account/RateDish'

export default function Rate() {
  const { token } = useParams()
  const { data: order, loading } = useOrderByToken(token)
  const back = token ? `/orders/${token}` : '/orders'

  if (loading) {
    return (
      <>
        <PageHeader title="Rate your food" back={back} />
        <div aria-busy="true" aria-label="Loading" className="space-y-3">
          <Skeleton className="h-36 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
        </div>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <PageHeader title="Rate your food" back="/orders" />
        <EmptyState
          title="We can't find that order"
          body="The link may be old, or the demo was reset."
          action={
            <Link to="/orders" className={buttonClasses('primary')}>
              See my orders
            </Link>
          }
        />
      </>
    )
  }

  if (order.status !== 'picked_up') {
    return (
      <>
        <PageHeader title="Rate your food" back={back} />
        <EmptyState
          title="Pick it up first"
          body="You can rate each dish once it is in your hands."
          action={
            <Link to={back} className={buttonClasses('primary')}>
              Track order {order.pickup_number}
            </Link>
          }
        />
      </>
    )
  }

  const left = order.items.filter((i) => !i.rated).length

  return (
    <>
      <PageHeader
        title="Rate your food"
        subtitle={left === 0 ? 'All rated. Thank you.' : `One tap per dish. The chefs read every one.`}
        back={back}
      />
      <ul className="space-y-3">
        {order.items.map((item) => (
          <RateDish key={item.id} token={order.access_token} item={item} />
        ))}
      </ul>
      {left === 0 && (
        <Link to="/orders" className={buttonClasses('secondary', 'lg', 'mt-6')}>
          Back to orders
        </Link>
      )}
    </>
  )
}
