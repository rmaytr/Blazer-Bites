import { Link, NavLink, Outlet } from 'react-router'
import { brand } from '@/config/brand'
import { cn } from '@/lib/cn'
import { ArrowLeftIcon } from './icons'
import { publicUrl } from '@/lib/publicUrl'

const NAV = [
  { to: '/team/kitchen', label: 'Kitchen' },
  { to: '/team/pilot', label: 'Pilot dashboard' },
]

/** Team view (tablet-first, uses the full width): top bar with the two team screens and a way back. */
export function StaffShell() {
  return (
    <div className="min-h-dvh">
      <a href="#staff-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-8">
          <span className="flex items-center gap-2.5 py-1.5">
            <img src={publicUrl(brand.logo.src)} alt="" className="size-8 rounded-small" />
            <span className="text-base font-bold">Team view</span>
          </span>
          <nav aria-label="Team" className="order-3 w-full overflow-x-auto md:order-none md:w-auto">
            <ul className="flex gap-1">
              {NAV.map((i) => (
                <li key={i.to} className="flex-none">
                  <NavLink
                    to={i.to}
                    className={({ isActive }) =>
                      cn(
                        'relative flex min-h-11 items-center px-3 text-base font-semibold whitespace-nowrap transition-colors',
                        isActive ? 'text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink' : 'text-muted hover:text-ink',
                      )
                    }
                  >
                    {i.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            to="/profile"
            className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-semibold text-primary hover:bg-raised"
          >
            <ArrowLeftIcon className="size-5" />
            Back to app
          </Link>
        </div>
      </header>
      <main id="staff-main" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
