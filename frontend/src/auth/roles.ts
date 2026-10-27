export type Role =
  | 'OPERATOR'
  | 'DISPATCHER'
  | 'FIELD_TECHNICIAN'
  | 'MAINTENANCE_SUPERVISOR'
  | 'SYSTEM_ADMIN'

export type IconName = 'alarm' | 'dispatch' | 'work' | 'closure' | 'admin'

export interface RoleConfig {
  label: string
  navLabel: string
  home: string
  icon: IconName
}

/** Display names, home routes and nav labels from docs/design/US-001/login-and-shell.md. */
export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  OPERATOR: { label: 'Control-Center Operator', navLabel: 'Alarm console', home: '/alarms', icon: 'alarm' },
  DISPATCHER: { label: 'Dispatcher', navLabel: 'Dispatch board', home: '/dispatch', icon: 'dispatch' },
  FIELD_TECHNICIAN: { label: 'Field Technician', navLabel: 'My work', home: '/work', icon: 'work' },
  MAINTENANCE_SUPERVISOR: {
    label: 'Maintenance Supervisor',
    navLabel: 'Work order closure',
    home: '/closure',
    icon: 'closure',
  },
  SYSTEM_ADMIN: { label: 'System Administrator', navLabel: 'Administration', home: '/admin', icon: 'admin' },
}

export const ROLES = Object.keys(ROLE_CONFIG) as Role[]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_CONFIG
}

export function homeFor(role: Role | null | undefined): string | null {
  return role ? ROLE_CONFIG[role].home : null
}
