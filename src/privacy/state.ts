// W33 privacy state, split out at W51 so the complaints store can record a durable
// suppression without importing the privacy store (which composes the complaints
// store in return — the import cycle is what made "no further contact" un-durable).
// Dependency order: complaints/store → privacy/state → privacy/privacy.

import { DEFAULT_RETENTION, type DeletionRecord, type RetentionConfig, type SuppressionEntry } from "./privacy";

export interface PrivacyState {
  retention: RetentionConfig;
  deletions: DeletionRecord[];
  suppressions: SuppressionEntry[];
}

const globalStore = globalThis as { __careyieldPrivacy?: PrivacyState };

function initial(): PrivacyState {
  return { retention: { ...DEFAULT_RETENTION }, deletions: [], suppressions: [] };
}

export function getPrivacy(): PrivacyState {
  globalStore.__careyieldPrivacy ??= initial();
  return globalStore.__careyieldPrivacy;
}

export function resetPrivacy(): PrivacyState {
  globalStore.__careyieldPrivacy = initial();
  return globalStore.__careyieldPrivacy;
}
