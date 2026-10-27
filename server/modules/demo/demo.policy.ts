import type { Role } from '@shared/roles'

/** Reset is for the demo administrator only (brief §17; shared/permissions.ts 'demo.reset'). */
export const DEMO_RESET_ROLES: readonly Role[] = ['admin']
