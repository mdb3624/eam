import type { IconName } from '@/auth/roles'

const PATHS: Record<IconName, JSX.Element> = {
  alarm: (
    <>
      <path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 004 0" />
    </>
  ),
  dispatch: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </>
  ),
  work: <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z" />,
  closure: <path d="M5 12l5 5L20 7" />,
  admin: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
}

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      {PATHS[name]}
    </svg>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M17.5 7L10 17h5l-1 8 8-11h-5z" fill="var(--primary)" />
    </svg>
  )
}

export function PowerLines() {
  return (
    <svg
      className="power-lines"
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="1.2"
      strokeOpacity=".55"
    >
      <path d="M0 150 Q100 175 200 150 T400 150" />
      <path d="M0 120 Q100 145 200 120 T400 120" strokeOpacity=".35" />
      <path d="M0 90 Q100 115 200 90 T400 90" strokeOpacity=".2" />
      <g strokeWidth="2" strokeOpacity=".8">
        <path d="M60 200V110M40 125h40M45 138h30" />
        <path d="M200 200V90M175 108h50M182 122h36" />
        <path d="M340 200V110M320 125h40M325 138h30" />
      </g>
    </svg>
  )
}
