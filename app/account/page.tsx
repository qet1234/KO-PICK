"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import "./account.css";

const DELETE_CONFIRM_TEXT = "회원탈퇴";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        window.location.replace("/login");
        return;
      }

      const provider = user.user_metadata?.provider;

      if (provider === "naver") {
        setEmail(
          user.user_metadata?.contact_email
            ? `네이버 계정 · ${user.user_metadata.contact_email}`
            : "네이버 계정",
        );
        return;
      }

      setEmail(user.email ?? "");
    };

    void checkUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.replace("/login");
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== DELETE_CONFIRM_TEXT || deleting) {
      return;
    }

    setDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "회원탈퇴 처리에 실패했습니다.",
        );
      }

      const supabase = createClient();

      await supabase.auth.signOut({
        scope: "local",
      });

      window.location.replace("/login?deleted=1");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원탈퇴 처리 중 오류가 발생했습니다.",
      );

      setDeleting(false);
    }
  };

  return (
    <main className="account-page">
      <section className="account-card">
        <header className="account-heading">
          <p>ACCOUNT SETTINGS</p>
          <h1>계정 설정</h1>
          <span>{email}</span>
        </header>

        <section className="account-section">
          <div>
            <h2>로그아웃</h2>
            <p>
              연결된 소셜 계정 자체가 아닌 KO-PICK 사이트
              로그인만 종료합니다.
            </p>
          </div>

          <button
            className="account-secondary-button"
            type="button"
            onClick={handleLogout}
          >
            사이트에서 로그아웃
          </button>
        </section>

        <section className="account-danger-section">
          <div>
            <span className="danger-label">
              DANGER ZONE
            </span>

            <h2>회원탈퇴</h2>

            <p>
              회원탈퇴 시 개인정보, 프로필, 즐겨찾기,
              추천 기록 및 서비스 이용 데이터가
              삭제됩니다.
            </p>

            <p>
              삭제된 정보는 복구할 수 없습니다.
              Google, 카카오, 네이버 계정 자체는 삭제되지
              않습니다.
            </p>
          </div>

          <button
            className="account-danger-button"
            type="button"
            onClick={() => setModalOpen(true)}
          >
            회원탈퇴
          </button>
        </section>

        {errorMessage && (
          <p className="account-error">
            {errorMessage}
          </p>
        )}

        <Link
          className="account-home-link"
          href="/"
        >
          ← 홈으로 돌아가기
        </Link>
      </section>

      {modalOpen && (
        <div className="account-modal-backdrop">
          <section className="account-modal">
            <span className="account-modal-icon">
              !
            </span>

            <h2>정말 회원탈퇴하시겠어요?</h2>

            <p>
              아래 정보가 영구 삭제되며 복구할 수
              없습니다.
            </p>

            <ul>
              <li>회원 프로필과 개인정보</li>
              <li>저장한 장소와 즐겨찾기</li>
              <li>추천 기록 및 서비스 이용 데이터</li>
            </ul>

            <p className="account-google-notice">
              연결된 소셜 계정 자체와 다른 사이트의
              로그인에는 영향을 주지 않습니다.
            </p>

            <label htmlFor="delete-confirm">
              계속하려면 <strong>회원탈퇴</strong>를
              입력하세요.
            </label>

            <input
              id="delete-confirm"
              value={confirmText}
              placeholder="회원탈퇴"
              disabled={deleting}
              onChange={(event) =>
                setConfirmText(event.target.value)
              }
            />

            <div className="account-modal-actions">
              <button
                className="account-modal-cancel"
                type="button"
                disabled={deleting}
                onClick={() => {
                  setModalOpen(false);
                  setConfirmText("");
                }}
              >
                취소
              </button>

              <button
                className="account-modal-delete"
                type="button"
                disabled={
                  confirmText !== DELETE_CONFIRM_TEXT ||
                  deleting
                }
                onClick={handleDeleteAccount}
              >
                {deleting ? "삭제 중..." : "영구 탈퇴"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
