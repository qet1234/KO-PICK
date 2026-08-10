"use client";

import { useState, type FormEvent } from "react";
import type { AppServiceMode, AppServiceStatusRecord } from "@/utils/app-service-status";

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
  const [affectedFeatures, setAffectedFeatures] = useState(initialStatus.affectedFeatures.join(", "));
  const [androidMinVersion, setAndroidMinVersion] = useState(initialStatus.androidMinVersion);
  const [iosMinVersion, setIosMinVersion] = useState(initialStatus.iosMinVersion);
  const [androidForceUpdate, setAndroidForceUpdate] = useState(initialStatus.androidForceUpdate);
  const [iosForceUpdate, setIosForceUpdate] = useState(initialStatus.iosForceUpdate);
  const [androidStoreUrl, setAndroidStoreUrl] = useState(initialStatus.androidStoreUrl ?? "");
  const [iosStoreUrl, setIosStoreUrl] = useState(initialStatus.iosStoreUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error?: boolean; message: string } | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/app-status", {
        body: JSON.stringify({
          affectedFeatures: affectedFeatures.split(",").map((item) => item.trim()).filter(Boolean),
          androidForceUpdate,
          androidMinVersion,
          androidStoreUrl,
          endsAt: inputToIso(endsAt),
          iosForceUpdate,
          iosMinVersion,
          iosStoreUrl,
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
          <p>Android·iOS 앱의 운영 상태와 필수 업데이트 안내를 원격으로 변경합니다.</p>
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
          <label className="service-field service-field-wide">
            <span>영향받는 기능 <small>쉼표로 구분</small></span>
            <input onChange={(event) => setAffectedFeatures(event.target.value)} placeholder="장소 찾기, 코스 추천, 직장인 식사" value={affectedFeatures} />
          </label>
        </div>

        <div className="update-control-grid">
          <article>
            <div><strong>Android 필수 업데이트</strong><small>현재 앱 버전보다 최소 버전이 높거나 강제 적용을 켜면 표시됩니다.</small></div>
            <label className="service-switch"><input checked={androidForceUpdate} onChange={(event) => setAndroidForceUpdate(event.target.checked)} type="checkbox" /><span />강제 적용</label>
            <label className="service-field"><span>최소 버전</span><input onChange={(event) => setAndroidMinVersion(event.target.value)} pattern="\d+\.\d+\.\d+" required value={androidMinVersion} /></label>
            <label className="service-field"><span>업데이트 주소</span><input onChange={(event) => setAndroidStoreUrl(event.target.value)} placeholder="https://..." type="url" value={androidStoreUrl} /></label>
          </article>
          <article>
            <div><strong>iOS 필수 업데이트</strong><small>TestFlight 또는 App Store 주소를 지정할 수 있습니다.</small></div>
            <label className="service-switch"><input checked={iosForceUpdate} onChange={(event) => setIosForceUpdate(event.target.checked)} type="checkbox" /><span />강제 적용</label>
            <label className="service-field"><span>최소 버전</span><input onChange={(event) => setIosMinVersion(event.target.value)} pattern="\d+\.\d+\.\d+" required value={iosMinVersion} /></label>
            <label className="service-field"><span>업데이트 주소</span><input onChange={(event) => setIosStoreUrl(event.target.value)} placeholder="https://..." type="url" value={iosStoreUrl} /></label>
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
