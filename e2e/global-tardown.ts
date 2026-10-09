import { sweepTestProfiles, sweepTestUsers } from './helpers'

/** Deletes any `cte2e`-marked test users (and their profile/storage rows)
 *  left behind by a failed run, plus orphaned `E2E …` profile rows whose
 *  Clerk user is already gone. Best-effort: never fails the suite. */
export default async function globalTeardown() {
  try {
    const removed = await sweepTestUsers()
    if (removed) console.log(`[teardown] removed ${removed} test user(s)`)
  } catch (e) {
    console.warn('[teardown] test-user sweep failed:', e)
  }
  try {
    const profiles = await sweepTestProfiles()
    if (profiles) console.log(`[teardown] removed ${profiles} orphaned E2E profile(s)`)
  } catch (e) {
    console.warn('[teardown] profile sweep failed:', e)
  }
}
