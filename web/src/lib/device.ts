// A stable per-browser token for owner login. Kept in localStorage so a
// returning owner is recognised and can skip the OTP email for 48h; a new
// browser/device has no token, so it's treated as untrusted and gets an OTP.
const OWNER_DEVICE_KEY = 'pfr-owner-device'

export function getOwnerDeviceId(): string {
  try {
    let id = localStorage.getItem(OWNER_DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(OWNER_DEVICE_KEY, id)
    }
    return id
  } catch {
    // localStorage blocked (private mode, etc.) — fall back to a fresh token,
    // which just means this login won't be remembered and will get an OTP.
    return crypto.randomUUID()
  }
}
