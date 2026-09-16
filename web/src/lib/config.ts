// Temporary kill-switch for online (Stripe) payments while the bank / Stripe
// account is being sorted out. When false:
//   - Services are request-only: no "pay now" button, no redirect to Stripe.
//     The owner activates a request manually (assign teacher → In progress).
// Flip back to true to re-enable Stripe checkout.
export const PAYMENTS_ENABLED = false
