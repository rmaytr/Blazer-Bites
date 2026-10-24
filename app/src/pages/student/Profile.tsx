import { Link } from 'react-router'
import { useDemoState, useSession } from '@/hooks'
import { updateProfile } from '@/demo/controls'
import { PageHeader, allergenName } from '@/components/ui'
import { ClassGapsEditor } from '@/features/account/ClassGapsEditor'
import { DemoControls } from '@/features/account/DemoControls'
import { SettingsSection, SwitchRow, ToggleChip, useSavedStamp } from '@/features/account/SettingControls'

const ALLERGENS = ['gluten', 'dairy', 'egg', 'soy', 'peanut', 'tree_nut', 'fish', 'shellfish', 'sesame'] as const

const toggled = (list: readonly string[], id: string): string[] => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

const TEAM_LINKS = [
  { to: '/team/kitchen', label: 'Kitchen board', note: 'What to cook next, by pickup window' },
  { to: '/team/pilot', label: 'Pilot dashboard', note: 'Taste, time and price from the pilot' },
]

export default function Profile() {
  const { profile } = useSession()
  const { menu, seededAt } = useDemoState()
  const dishes = menu.filter((m) => m.status !== 'archived' && !m.is_next_special && !m.is_sample)
  const favs = useSavedStamp()
  const allergens = useSavedStamp()
  const notify = useSavedStamp()
  const gaps = useSavedStamp()

  return (
    <>
      <PageHeader title="Profile" />

      <section aria-label="You" className="flex items-center gap-4 rounded-card bg-surface p-5">
        <span aria-hidden className="grid size-14 flex-none place-items-center rounded-full bg-gold-tint text-xl font-bold text-gold-ink">
          {(profile.display_name ?? 'You')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="text-xl leading-tight font-bold">{profile.display_name}</p>
          <p className="truncate text-sm text-muted">{profile.email}</p>
          {profile.is_uab && (
            <span className="mt-1.5 inline-flex rounded-full bg-campus-tint px-2.5 py-0.5 text-[13px] font-semibold text-campus-ink">UAB student</span>
          )}
        </div>
      </section>

      <div className="mt-3 space-y-3">
        <SettingsSection title="Favourite dishes" description="Shown first when you order." saved={favs.saved}>
          <div className="flex flex-wrap gap-2">
            {dishes.map((d) => (
              <ToggleChip
                key={d.id}
                tone="positive"
                pressed={profile.favorite_item_ids.includes(d.id)}
                onToggle={() => {
                  updateProfile({ favorite_item_ids: toggled(profile.favorite_item_ids, d.id) })
                  favs.flash()
                }}
              >
                {d.name}
              </ToggleChip>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="Allergens I avoid" description="Dishes with these get a warning on the menu." saved={allergens.saved}>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <ToggleChip
                key={a}
                tone="danger"
                pressed={profile.allergen_prefs.includes(a)}
                onToggle={() => {
                  updateProfile({ allergen_prefs: toggled(profile.allergen_prefs, a) })
                  allergens.flash()
                }}
              >
                {allergenName(a)}
              </ToggleChip>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="Notifications" saved={notify.saved}>
          <SwitchRow
            label="Food is ready"
            description="A buzz and a banner the moment it is ready."
            checked={profile.notify_ready}
            onChange={(on) => {
              updateProfile({ notify_ready: on })
              notify.flash()
            }}
          />
          <SwitchRow
            label="5-minute reminder"
            description="Before your pickup window opens."
            checked={profile.notify_reminder}
            onChange={(on) => {
              updateProfile({ notify_reminder: on })
              notify.flash()
            }}
          />
        </SettingsSection>

        <SettingsSection title="My class gaps" description="We suggest pickup windows that fit between classes. Campus time." saved={gaps.saved}>
          <ClassGapsEditor key={seededAt} gaps={profile.class_gaps} onSaved={gaps.flash} />
        </SettingsSection>

        <DemoControls />

        <section aria-labelledby="team-title" className="rounded-card bg-surface p-5">
          <h2 id="team-title" className="text-base font-semibold">
            Team view
          </h2>
          <p className="mt-1 text-sm text-muted">What the crew at the cart sees.</p>
          <ul className="mt-2">
            {TEAM_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="-mx-2 flex min-h-14 items-center justify-between gap-3 rounded-inner px-2 py-2 transition-colors hover:bg-ground">
                  <span>
                    <span className="block text-[15px] font-medium">{l.label}</span>
                    <span className="block text-[13px] text-muted">{l.note}</span>
                  </span>
                  <svg viewBox="0 0 24 24" aria-hidden className="size-5 flex-none text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
