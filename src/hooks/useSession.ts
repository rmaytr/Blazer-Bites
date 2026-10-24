import { useDemoState } from './useDemo'
import type { Profile, Role } from '@/types/app'

export interface SessionState {
  /** The demo student (Jordan Lee), always signed in. */
  profile: Profile
  role: Role
  loading: boolean
}

/** Demo session: no sign-in; the seeded student is the user. */
export function useSession(): SessionState {
  return { profile: useDemoState().profile, role: 'student', loading: false }
}
