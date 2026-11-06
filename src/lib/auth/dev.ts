/** True only in `next dev`: the password form is for local test accounts, never a deployed site (D25). */
export function devPasswordSignInAllowed() {
  return process.env.NODE_ENV === "development";
}
