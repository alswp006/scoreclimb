// Toss review compliance utilities

/** Checks whether ad config (group + slot id) is set via env vars. */
export function hasAdConfig(): boolean {
  return import.meta.env.VITE_TOSS_AD_GROUP_ID && import.meta.env.VITE_TOSS_AD_SLOT_ID ? true : false;
}
