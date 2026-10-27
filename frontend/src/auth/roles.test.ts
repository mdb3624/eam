// Story: US-001. AC 1 (role-appropriate home and navigation).
import { ROLE_CONFIG, homeFor, isRole } from './roles'

describe('roles', () => {
  it('maps each MVP role to its home route and nav label', () => {
    expect(ROLE_CONFIG.OPERATOR).toMatchObject({ home: '/alarms', navLabel: 'Alarm console', label: 'Control-Center Operator' })
    expect(ROLE_CONFIG.DISPATCHER).toMatchObject({ home: '/dispatch', navLabel: 'Dispatch board', label: 'Dispatcher' })
    expect(ROLE_CONFIG.FIELD_TECHNICIAN).toMatchObject({ home: '/work', navLabel: 'My work', label: 'Field Technician' })
    expect(ROLE_CONFIG.MAINTENANCE_SUPERVISOR).toMatchObject({
      home: '/closure',
      navLabel: 'Work order closure',
      label: 'Maintenance Supervisor',
    })
    expect(ROLE_CONFIG.SYSTEM_ADMIN).toMatchObject({ home: '/admin', navLabel: 'Administration', label: 'System Administrator' })
  })

  it('homeFor returns null when there is no role', () => {
    expect(homeFor(null)).toBeNull()
    expect(homeFor(undefined)).toBeNull()
    expect(homeFor('DISPATCHER')).toBe('/dispatch')
  })

  it('isRole accepts only known role values', () => {
    expect(isRole('DISPATCHER')).toBe(true)
    expect(isRole('GOD_MODE')).toBe(false)
    expect(isRole(undefined)).toBe(false)
  })
})
