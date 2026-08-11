import "server-only";

import { createAdminClient } from "@/utils/admin";
import { defaultOperationalFeatureFlags, type OperationalFeatureKey } from "@/utils/app-service-status";

export async function isOperationalFeatureEnabled(feature: OperationalFeatureKey) {
  try {
    const { data, error } = await createAdminClient()
      .from("app_service_status")
      .select("feature_flags")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data?.feature_flags || typeof data.feature_flags !== "object") {
      return defaultOperationalFeatureFlags[feature];
    }
    return (data.feature_flags as Record<string, unknown>)[feature] !== false;
  } catch {
    // 운영 제어 DB 장애 시에는 정상 사용자를 잠그지 않습니다.
    return true;
  }
}
