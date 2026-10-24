import { useEffect, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useBasket } from '@/hooks/useBasket'
import { cn } from '@/lib/cn'
import { BagIcon, HomeIcon, PersonIcon, ReceiptIcon, RewardsIcon, type IconProps } from './icons'

interface Tab {
  to: string
  label: string
  Icon: ComponentType<IconProps>
}

const LEFT: Tab[] = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/rewards', label: 'Rewards', Icon: RewardsIcon },
]
const RIGHT: Tab[] = [
  { to: '/orders', label: 'Orders', Icon: ReceiptIcon },
  { to: '/profile', label: 'Profile', Icon: PersonIcon },
]

/** Flow screens where the bottom bar would compete with the one primary action. */
const HIDE_NAV = [/^\/checkout/]

const indicator = 'absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-ink'

function TabLink({ to, label, Icon }: Tab) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-[var(--nav-h)] flex-col items-center justify-center gap-1 text-[13px] font-semibold transition-colors',
          isActive ? 'text-ink' : 'text-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden className={indicator} />}
          <Icon className="size-6" />
          {label}
        </>
      )}
    </NavLink>
  )
}

/** The centre tab: a raised Dragon's Lair Green pill with the live bag count. */
function OrderTab() {
  const { count } = useBasket()
  return (
    <NavLink
      to="/order"
      aria-label={count > 0 ? `Order, ${count} in your bag` : 'Order'}
      className="group relative flex min-h-[var(--nav-h)] flex-col items-center justify-start"
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              '-mt-4 flex h-16 w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-full bg-deep text-[13px] font-semibold text-on-deep ring-4 ring-surface',
              'transition-transform duration-150 group-active:scale-95 motion-reduce:group-active:scale-100',
            )}
          >
            <BagIcon className="size-6" />
            Order
          </span>
          {count > 0 && (
            <span
              aria-hidden
              className="num absolute -top-4 left-1/2 ml-4 grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1.5 text-[13px] font-bold text-on-gold ring-2 ring-surface"
            >
              {count}
            </span>
          )}
          {isActive && <span aria-hidden className={cn(indicator, 'top-auto bottom-1.5')} />}
        </>
      )}
    </NavLink>
  )
}

// The desktop phone frame's outer size (393 x 852 screen plus its 9px glass border and 5px band) and
// the breathing room kept around it. Must match .phone-frame in index.css.
const FRAME_W = 421
const FRAME_H = 880
const MARGIN = 32
const MAX_SCALE = 1.2

/** Scales the desktop phone frame to fit the window while keeping its real proportions. */
function usePhoneScale() {
  useEffect(() => {
    const root = document.documentElement
    const fit = () => {
      const scale = Math.min(
        MAX_SCALE,
        (window.innerHeight - MARGIN * 2) / FRAME_H,
        (window.innerWidth - MARGIN) / FRAME_W,
      )
      root.style.setProperty('--phone-scale', String(Math.max(scale, 0.4)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      root.style.removeProperty('--phone-scale')
    }
  }, [])
}

/** Student layout: one centred column (max 480px), 5-tab bottom bar inside the safe area. */
export function AppShell() {
  const { pathname } = useLocation()
  const showNav = !HIDE_NAV.some((r) => r.test(pathname))
  usePhoneScale()

  return (
    <div className="phone-frame-backdrop">
      <div className="phone-frame">
        <div className="phone-frame-notch" aria-hidden="true" />
        <div className="phone-frame-home-indicator" aria-hidden="true" />
        <div className="phone-frame-viewport">
          <div className="phone-frame-status" aria-hidden="true">
            <span>9:41</span>
          </div>
          <div className="phone-frame-screen">
            <div className="min-h-dvh pt-[env(safe-area-inset-top)]">
              <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
                Skip to content
              </a>
              <main
                id="main"
                className={cn(
                  'mx-auto w-full max-w-[480px] px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
                  showNav ? 'pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)]' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
                )}
              >
                <Outlet />
              </main>
              {showNav && (
                <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
                  <ul className="mx-auto grid max-w-[480px] grid-cols-5 px-1">
                    {LEFT.map((t) => (
                      <li key={t.to}>
                        <TabLink {...t} />
                      </li>
                    ))}
                    <li>
                      <OrderTab />
                    </li>
                    {RIGHT.map((t) => (
                      <li key={t.to}>
                        <TabLink {...t} />
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
