import { Toaster as SonnerToaster } from 'sonner'

export { toast } from 'sonner'

/** Mount once at the app root. Light theme only (demo). */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="light"
      offset={{ top: 'max(12px, env(safe-area-inset-top))' }}
      mobileOffset={{ top: 'max(12px, env(safe-area-inset-top))' }}
      toastOptions={{ style: { borderRadius: '12px', fontFamily: 'inherit' } }}
    />
  )
}
