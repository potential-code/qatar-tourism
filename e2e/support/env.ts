/** Shared constants for the e2e walkthrough. */
export const API_URL = 'http://localhost:8140'
export const CLIENT_ORIGIN = 'http://localhost:5240'
export const DEMO_PASSWORD = 'DemoAcademy2026!'

export const ACCOUNTS = {
  admin: 'admin@example.com',
  maha: 'learner0001@example.com',
  omar: 'learner0002@example.com',
  leila: 'learner0003@example.com',
  daniel: 'learner0004@example.com',
  sara: 'learner0005@example.com',
  trainer: (n: number) => `trainer${String(n).padStart(2, '0')}@example.com`,
} as const
