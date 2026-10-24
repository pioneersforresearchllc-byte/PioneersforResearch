// Temporary kill-switch for online (Stripe) payments while the bank / Stripe
// account is being sorted out. When false:
//   - Services are request-only: no "pay now" button, no redirect to Stripe.
//     The owner activates a request manually (assign teacher → In progress).
// Flip back to true to re-enable Stripe checkout.
export const PAYMENTS_ENABLED = false

// National ID / Iqama collection on the student Account page. It only exists
// to issue NELC-accredited certificates (xAPI → LRS, migration 0083), which
// need a TVTC training licence the company doesn't hold yet — so until then
// we don't ask for it (PDPL data minimisation, and no "accredited" promise).
// Flip to true once accredited delivery is actually live.
export const NATIONAL_ID_ENABLED = false
