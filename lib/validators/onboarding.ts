import { z } from 'zod'

/** 10 digits after +63 (accepts common typing: spaces, +63/0 prefixes). */
export function normalizeMobile(v: string) {
  let d = v.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('63')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d
}

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(80),
  mobile: z
    .string()
    .transform(normalizeMobile)
    .refine((d) => d.length === 10 && d.startsWith('9'), 'Enter the 10 digits after +63 (for example 917 448 2210).'),
  barangayId: z.string().uuid('Please choose the barangay you live in.'),
  street: z.string().trim().min(3, 'Please enter your street or address.').max(160),
  consentTerms: z.boolean().refine((v) => v === true, 'You must accept the Terms of Use.'),
  consentPrivacy: z.boolean().refine((v) => v === true, 'You must accept the Data Privacy Notice.'),
  consentUpdates: z.boolean().optional(),
})
export type OnboardingInput = z.infer<typeof onboardingSchema>
