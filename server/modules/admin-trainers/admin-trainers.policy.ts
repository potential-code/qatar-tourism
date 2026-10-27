import type { Role } from '@shared/roles'

/** Trainer management is admin only ('permissions.manage', 'path.change' in the §11 matrix). */
export const TRAINER_ADMIN_ROLES: readonly Role[] = ['admin']
