"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import AdminSecurityMonitor from "./AdminSecurityMonitor";
import {
  appServiceFeatureOptions,
  operationalFeatureDefinitions,
  type AppServiceMode,
  type AppServiceStatusRecord,
} from "@/utils/app-service-status";

const modeLabels: Record<AppServiceMode, string> = {
  maintenance: "전체 점검",
  operational: "정상 운영",
  partial: "일부 기능 점검",
};

function koreaDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function inputToIso(value: string) {
  return value ? new Date(`${value}:00+09:00`).toISOString() : null;
}

export default function AdminServiceControl({ initialStatus }: { initialStatus: AppServiceStatusRecord }) {
  const [mode, setMode] = useState(initialStatus.mode);
  const [title, setTitle] = useState(initialStatus.title);
  const [message, setMessage] = useState(initialStatus.message);
  const [startsAt, setStartsAt] = useState(koreaDateTimeInput(initialStatus.startsAt));
  const [endsAt, setEndsAt] = useState(koreaDateTimeInput(initialStatus.endsAt));
  const [affectedFeatures, setAffectedFeatures] = useState(initialStatus.affectedFeatures);
  const [featureFlags, setFeatureFlags] = useState(initialStatus.featureFlags);
  const [customFeature, setCustomFeature] = useState("");
  const [androidMinVersion, setAndroidMinVersion] = useState(initialStatus.androidMinVersion);
  const [androidForceUpdate, setAndroidForceUpdate] = useState(initialStatus.androidForceUpdate);
  const [androidStoreUrl, setAndroidStoreUrl] = useState(initialStatus.androidStoreUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error?: boolean; message: string } | null>(null);

  const toggleFeature = (feature: string) => {
    setAffectedFeatures((current) => {
      if (current.includes(feature)) return current.filter((item) => item !== feature);
      if (current.length >= 12) {
        setResult({ error: true, message: "기능은 최대 12개까지 선택할 수 있습니다." });
        return current;
      }
      return [...current, feature];
    });
  };

  const addCustomFeature = () => {
    const feature = customFeature.trim();
    if (!feature) return;
    if (feature.length > 40) {
      setResult({ error: true, message: "직접 추가 기능은 40자 이내로 입력해 주세요." });
      return;
    }
    if (affectedFeatures.includes(feature)) {
      setCustomFeature("");
      return;
    }
    if (affectedFeatures.length >= 12) {
      setResult({ error: true, message: "기능은 최대 12개까지 선택할 수 있습니다." });
      return;
    }
    setAffectedFeatures((current) => [...current, feature]);
    setCustomFeature("");
    setResult(null);
  };

  const addCustomFeatureOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCustomFeature();
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/app-status", {
        body: JSON.stringify({
          affectedFeatures,
          androidForceUpdate,
          androidMinVersion,
          androidStoreUrl,
          endsAt: inputToIso(endsAt),
          featureFlags,
          message,
          mode,
          startsAt: inputToIso(startsAt),
          title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "운영 상태를 저장하지 못했습니다.");
      setResult({ message: "저장되었습니다. 앱을 다시 열거나 재확인하면 즉시 반영됩니다." });
    } catch (error) {
      setResult({ error: true, message: error instanceof Error ? error.message : "운영 상태를 저장하지 못했습니다." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-panel service-control" id="service-control">
      <div className="admin-section-heading">
        <div>
          <span className="admin-kicker">APP SERVICE CONTROL</span>
          <h2>앱 점검·업데이트 제어</h2>
          <p>Android 앱의 운영 상태와 필수 업데이트 안내를 원격으로 변경합니다.</p>
        </div>
        <strong className={`service-mode-badge is-${mode}`}>{modeLabels[mode]}</strong>
      </div>

      <form className="service-control-form" onSubmit={save}>
        <fieldset className="service-mode-options">
          <legend>운영 상태</legend>
          {(["operational", "partial", "maintenance"] as const).map((item) => (
            <label className={`service-mode-option is-${item}`} key={item}>
              <input checked={mode === item} name="service-mode" onChange={() => setMode(item)} type="radio" />
              <span><strong>{modeLabels[item]}</strong><small>{item === "operational" ? "모든 기능 정상 이용" : item === "partial" ? "안내 후 앱 이용 가능" : "안내 화면에서 이용 차단"}</small></span>
            </label>
          ))}
        </fieldset>

        <div className="service-form-grid">
          <label className="service-field service-field-wide">
            <span>안내 제목</span>
            <input maxLength={80} onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label className="service-field service-field-wide">
            <span>안내 내용</span>
            <textarea maxLength={500} onChange={(event) => setMessage(event.target.value)} required rows={4} value={message} />
          </label>
          <label className="service-field">
            <span>점검 시작 시간 <small>한국 시간</small></span>
            <input onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} />
          </label>
          <label className="service-field">
            <span>점검 종료 시간 <small>한국 시간</small></span>
            <input onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} />
          </label>
        </div>

        <fieldset className="service-feature-picker">
          <legend>기능 선택</legend>
          <div className="service-feature-heading">
            <p>
              {mode === "operational"
                ? "정상 운영 상태에서도 관리할 기능을 선택해 둘 수 있습니다. 앱에는 점검 안내가 표시되지 않습니다."
                : "선택한 기능은 Android 점검 안내의 영향받는 기능에 표시됩니다."}
            </p>
            <div>
              <button
                onClick={() => setAffectedFeatures((current) => Array.from(new Set([...appServiceFeatureOptions, ...current])).slice(0, 12))}
                type="button"
              >전체 선택</button>
              <button onClick={() => setAffectedFeatures([])} type="button">선택 해제</button>
            </div>
          </div>
          <div className="service-feature-options">
            {appServiceFeatureOptions.map((feature) => (
              <label className="service-feature-option" key={feature}>
                <input
                  checked={affectedFeatures.includes(feature)}
                  onChange={() => toggleFeature(feature)}
                  type="checkbox"
                />
                <span>{feature}</span>
              </label>
            ))}
          </div>
          <div className="service-custom-feature">
            <label className="service-field">
              <span>기타 기능 직접 추가 <small>최대 40자</small></span>
              <input
                maxLength={40}
                onChange={(event) => setCustomFeature(event.target.value)}
                onKeyDown={addCustomFeatureOnEnter}
                placeholder="예: 네이버 예약"
                value={customFeature}
              />
            </label>
            <button disabled={!customFeature.trim()} onClick={addCustomFeature} type="button">추가</button>
          </div>
          {affectedFeatures.length > 0 ? (
            <div className="service-selected-features">
              <strong>선택됨 {affectedFeatures.length}/12</strong>
              <div>
                {affectedFeatures.map((feature) => (
                  <button aria-label={`${feature} 선택 해제`} key={feature} onClick={() => toggleFeature(feature)} type="button">
                    {feature}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            </div>
          ) : <p className="service-feature-empty">선택한 기능이 없습니다.</p>}
        </fieldset>

        <fieldset className="service-feature-picker operational-flags">
          <legend>기능별 원격 활성화·비활성화</legend>
          <div className="service-feature-heading">
            <p>배포 없이 기능을 즉시 숨길 수 있습니다. 장애가 발생한 기능만 끄고 나머지 서비스는 계속 운영하세요.</p>
            <div>
              <button onClick={() => setFeatureFlags(Object.fromEntries(operationalFeatureDefinitions.map(({ key }) => [key, true])) as typeof featureFlags)} type="button">전체 켜기</button>
              <button onClick={() => setFeatureFlags(Object.fromEntries(operationalFeatureDefinitions.map(({ key }) => [key, false])) as typeof featureFlags)} type="button">전체 끄기</button>
            </div>
          </div>
          <div className="operational-flag-grid">
            {operationalFeatureDefinitions.map(({ key, label }) => (
              <label className={`operational-flag${featureFlags[key] ? " is-enabled" : ""}`} key={key}>
                <span><strong>{label}</strong><small>{featureFlags[key] ? "사용 가능" : "사용 중지"}</small></span>
                <input
                  checked={featureFlags[key]}
                  onChange={(event) => setFeatureFlags((current) => ({ ...current, [key]: event.target.checked }))}
                  type="checkbox"
                />
                <i aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>

        <AdminSecurityMonitor />

        <div className="update-control-grid">
          <article>
            <div><strong>Android 필수 업데이트</strong><small>현재 앱 버전보다 최소 버전이 높거나 강제 적용을 켜면 표시됩니다.</small></div>
            <label className="service-switch"><input checked={androidForceUpdate} onChange={(event) => setAndroidForceUpdate(event.target.checked)} type="checkbox" /><span />강제 적용</label>
            <label className="service-field"><span>최소 버전</span><input onChange={(event) => setAndroidMinVersion(event.target.value)} pattern="\d+\.\d+\.\d+" required value={androidMinVersion} /></label>
            <label className="service-field"><span>업데이트 주소</span><input onChange={(event) => setAndroidStoreUrl(event.target.value)} placeholder="https://..." type="url" value={androidStoreUrl} /></label>
          </article>
        </div>

        <div className="service-save-row">
          <p className={result?.error ? "is-error" : ""} role="status">{result?.message ?? "점검 API 장애 시에는 정상 이용자를 잠그지 않고 앱을 실행합니다."}</p>
          <button disabled={saving} type="submit">{saving ? "저장 중..." : "운영 상태 저장"}</button>
        </div>
      </form>
    </section>
  );
}
