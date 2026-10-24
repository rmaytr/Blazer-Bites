// Every route (docs/spec.md, Screens and routes). Screen workstreams replace page files; they never edit this router.
import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { StaffShell } from '@/components/layout/StaffShell'
import { PageFallback, RouteError } from './RouteError'

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    HydrateFallback: PageFallback,
    children: [
      { index: true, lazy: page(() => import('@/pages/student/Home')) },
      { path: 'order', lazy: page(() => import('@/pages/student/Order')) },
      { path: 'order/time', lazy: page(() => import('@/pages/student/PickupTime')) },
      { path: 'checkout', lazy: page(() => import('@/pages/student/Checkout')) },
      { path: 'orders', lazy: page(() => import('@/pages/student/Orders')) },
      { path: 'orders/:token', lazy: page(() => import('@/pages/student/Tracking')) },
      { path: 'orders/:token/rate', lazy: page(() => import('@/pages/student/Rate')) },
      { path: 'rewards', lazy: page(() => import('@/pages/student/Rewards')) },
      { path: 'profile', lazy: page(() => import('@/pages/student/Profile')) },
      { path: '*', lazy: page(() => import('@/pages/NotFound')) },
    ],
  },
  {
    path: 'team',
    element: <StaffShell />,
    errorElement: <RouteError />,
    HydrateFallback: PageFallback,
    children: [
      { index: true, element: <Navigate to="/team/kitchen" replace /> },
      { path: 'kitchen', lazy: page(() => import('@/pages/team/Kitchen')) },
      { path: 'pilot', lazy: page(() => import('@/pages/team/Pilot')) },
    ],
  },
]

// Locally the app is served at /. In the combined deploy (see the root README) it's nested
// under /app/, which Vite's `base` config already knows (`import.meta.env.BASE_URL`); the router
// needs the same prefix stripped from `location.pathname` before it matches a route.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export const router = createBrowserRouter(routes, { basename })
