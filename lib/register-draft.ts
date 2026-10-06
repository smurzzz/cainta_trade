/** Register step-1 draft shared across the /sign-up → /onboarding route split
 *  (docs/08 #9). Deliberately excludes the password — that is sent to Clerk at
 *  step 1 and never persisted here. sessionStorage: per-tab, cleared on close. */
export type RegisterDraft = {
  fullName: string
  email: string
  mobile: string
  barangay: string
  street: string
}

const KEY = 'ct-register-draft'

export function saveDraft(draft: RegisterDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* storage unavailable — step 2 just runs without the extra metadata */
  }
}

export function loadDraft(): RegisterDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RegisterDraft) : null
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
