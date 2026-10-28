import { z } from 'zod'
import { PROGRAMME_CODES } from '../constants/enums'
import { fictionalEmail } from './common'

const list = z.array(z.string().trim().min(1).max(60)).max(12)

export const adminTrainerUpdateInput = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    headline: z.string().trim().min(2).max(120),
    bio: z.string().trim().min(10, 'Write a short bio of at least 10 characters').max(800),
    expertise: list,
    languages: list.min(1, 'Add at least one language'),
    organisation: z.string().trim().min(2).max(120),
  })
  .partial()
export type AdminTrainerUpdateInput = z.infer<typeof adminTrainerUpdateInput>

export const adminTrainerCreateInput = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name').max(120),
  email: fictionalEmail,
  headline: z.string().trim().min(2, 'Enter a headline').max(120),
  bio: z.string().trim().min(10, 'Write a short bio of at least 10 characters').max(800),
  expertise: list,
  languages: list.min(1, 'Add at least one language'),
  organisation: z.string().trim().min(2).max(120),
  programmes: z.array(z.enum(PROGRAMME_CODES)).max(3),
})
export type AdminTrainerCreateInput = z.infer<typeof adminTrainerCreateInput>

export const adminTrainerProgrammesInput = z.object({
  programmes: z.array(z.enum(PROGRAMME_CODES)).max(3),
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters').max(300),
})

export const trainerIdParam = z.object({ trainerId: z.uuid() })
