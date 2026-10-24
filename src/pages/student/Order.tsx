// Order: the menu for the chosen cart, food first (docs/spec.md, screen 2). ?cart=<id> preselects the cart.
import { MotionConfig } from 'motion/react'
import { useSearchParams } from 'react-router'
import { EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { useBasket } from '@/hooks/useBasket'
import { useCarts } from '@/hooks/useCarts'
import { useMenu } from '@/hooks/useMenu'
import { useSession } from '@/hooks/useSession'
import { useSwitchCart } from '@/features/order/hooks'
import { MenuCard } from '@/features/order/MenuCard'
import { BagBar, ExpressNote, NextSpecialCard, PickupChip } from '@/features/order/OrderParts'
import { soonestCart } from '@/features/order/pickup'

function MenuSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading the menu">
      <Skeleton className="h-11 w-64 rounded-full" />
      {[0, 1].map((i) => (
        <div key={i} className="overflow-hidden rounded-card bg-surface">
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="space-y-2 p-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Order() {
  const [params, setParams] = useSearchParams()
  const basket = useBasket()
  const switchCart = useSwitchCart()
  const { profile } = useSession()
  const { data: carts } = useCarts()

  // The link's cart, else the bag's cart, else the soonest one.
  const cartId = params.get('cart') ?? (basket.lines.length ? basket.cartId : null) ?? (carts ? soonestCart(carts)?.id : undefined)
  const { data: menu, loading } = useMenu(cartId ?? undefined)
  const cart = menu?.cart ?? null

  const choose = (id: string) => {
    if (basket.lines.length) switchCart(id)
    setParams({ cart: id }, { replace: true })
  }

  const inBag = (itemId: string) => basket.lines.filter((l) => l.menuItemId === itemId).reduce((n, l) => n + l.qty, 0)
  const soldOut = new Set(cart?.sold_out_item_ids ?? [])
  const shown = menu ? (menu.surge ? menu.all.filter((i) => i.is_express) : menu.all) : []

  return (
    <MotionConfig reducedMotion="user">
      <PageHeader title="Order" />
      {loading || !carts ? (
        <MenuSkeleton />
      ) : !cart || !menu ? (
        <EmptyState title="No carts out right now" body="Carts serve weekdays, 10:30 AM to 2:30 PM." />
      ) : (
        <>
          <PickupChip cart={cart} carts={carts} onChoose={choose} />
          {!cart.is_open ? (
            <EmptyState className="mt-4" title={`${cart.name} is closed today`} body="Pick another cart from the pickup chip above." />
          ) : (
            <div className="mt-4 space-y-4">
              {menu.surge && <ExpressNote />}
              {shown.map((item) => (
                <MenuCard
                  key={`${cart.id}-${item.id}`}
                  item={item}
                  soldOut={soldOut.has(item.id)}
                  avoid={profile.allergen_prefs}
                  inBag={inBag(item.id)}
                  onAdd={(variant) => {
                    switchCart(cart.id) // keeps what's already in the bag when it came from another cart
                    basket.add({ menuItemId: item.id, variant, qty: 1 }, cart.id)
                  }}
                />
              ))}
              {menu.nextSpecial && <NextSpecialCard item={menu.nextSpecial} />}
            </div>
          )}
          {basket.count > 0 && <div aria-hidden className="h-20" />}
        </>
      )}
      <BagBar count={basket.count} lines={basket.lines} />
    </MotionConfig>
  )
}
