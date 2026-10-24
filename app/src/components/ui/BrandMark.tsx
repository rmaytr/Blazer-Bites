import { cn } from '@/lib/cn'

/** The Blazer Bites dragon: a gold dragon slurping noodles from a UAB green bowl, no tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="5 5 54 51" aria-hidden className={cn('drop-shadow-[0_4px_8px_rgba(15,61,34,0.22)]', className)}>
      <defs>
      <linearGradient id="bm-bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1F6B3E"/><stop offset="1" stopColor="#0E3A20"/></linearGradient>
      <linearGradient id="bm-scale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD54F"/><stop offset="1" stopColor="#F4A30A"/></linearGradient>
      <linearGradient id="bm-horn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF7DC"/><stop offset="1" stopColor="#F2DFA8"/></linearGradient>
      </defs>
      <path d="M22.5 17.5C19 13 14.5 10.5 9 10.2c3.6 2.2 6.4 5.4 8.2 9.6z" fill="url(#bm-horn)"/>
      <path d="M28.5 15.6c-1.4-4.4-4.4-7.8-8.8-9.8 2.2 3 3.4 6.4 3.6 10.4z" fill="url(#bm-horn)"/>
      <path d="M12.6 22.4l-5 1.2 4 2.6-4.6 2.6 4.4 1.8-4 3.2 5 .6" fill="#E8590C"/>
      <path d="M11.6 36.8c-1.4-3-1.9-6.4-1.2-9.8 1.4-7.2 7.4-11.8 14.6-11.6 5.6.2 9.6 3 11.6 7.4l11.2 2.4c2.8.6 4.4 3.4 3.4 6l-.9 2.4c-.6 1.7-2.4 2.7-4.2 2.4l-10-1.6c-1.2.8-2.6 1.4-4.2 1.8z" fill="url(#bm-scale)"/>
      <path d="M35.8 33.2c3.6 1.4 7.6 1.8 11.4 1.2" stroke="#9A5200" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M21 33.6l-3.2 3.4 4.4-.4-1.6 3.2 4.2-2" fill="#E8590C"/>
      <path d="M24.6 20.2l7.6-1.6" stroke="#E8590C" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <path d="M25.2 24.4c1.6-1.8 4.4-1.9 6-.2" stroke="#0F2A1A" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
      <path d="M46.2 26.6c.9-.4 1.9-.1 2.4.7" stroke="#9A5200" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M52 21c-1.2-1.6-.8-3.4.8-4.4M55.6 22c-1.4-2.4-.6-5 1.8-6.2" stroke="#1A5632" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M39.4 34.2c-1.2 2-1 4.2.4 6.2M42.6 34.8c-.8 1.8-.6 3.6.6 5.4M45.6 34.8c.2 1.8 0 3.4-.8 5" stroke="#E9B949" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      <path d="M12 41h40c0 8.2-7.6 13.4-20 13.4S12 49.2 12 41z" fill="url(#bm-bowl)"/>
      <path d="M12 41h40" stroke="#FDB913" strokeWidth="3" strokeLinecap="round"/>
      <path d="M22 45.5c6.4 2 13.6 2 20 0" stroke="#FFFFFF" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

/** The home screen's wordmark: the dragon, then "Blazer" in heavy sans and "Bites" in serif italic. */
export function BrandHeader() {
  return (
    <header className="flex items-center gap-3 pt-4 pb-5">
      <BrandMark className="h-14 w-auto flex-none" />
      <h1 className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[34px] font-extrabold tracking-[-0.045em]">Blazer</span>
        <span className="brand-bites font-display text-[40px] italic">Bites</span>
      </h1>
    </header>
  )
}
