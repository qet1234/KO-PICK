"use client";

import { defaultOperationalFeatureFlags, type OperationalFeatureFlags, type OperationalFeatureKey } from "@/utils/app-service-status";

let latestFlags: OperationalFeatureFlags = defaultOperationalFeatureFlags;

export function setClientFeatureFlags(flags: OperationalFeatureFlags | null) {
  latestFlags = flags ?? defaultOperationalFeatureFlags;
}

export function isClientFeatureEnabled(feature: OperationalFeatureKey) {
  return latestFlags[feature] !== false;
}
