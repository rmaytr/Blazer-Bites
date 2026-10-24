import { MotionConfig } from 'motion/react'
import { RouterProvider } from 'react-router'
import { BasketProvider } from '@/hooks/useBasket'
import { Toaster } from '@/components/ui/toast'
import { router } from './router'

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BasketProvider>
        <RouterProvider router={router} />
        <Toaster />
      </BasketProvider>
    </MotionConfig>
  )
}
