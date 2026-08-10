"use client";

import { useMemo, useState } from "react";

export type AdminAccount = {
  createdAt: string;
  email: string;
  id: string;
  lastSignInAt: string | null;
  name: string;
  providers: string[];
  status: "active" | "banned" | "unconfirmed";
};

const statusLabels = {
  active: "정상",
  banned: "정지",
  unconfirmed: "확인 전",
} as const;

function dateTime(value: string | null) {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminAccounts({ accounts }: { accounts: AdminAccount[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AdminAccount["status"]>("all");

  const visibleAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesStatus = status === "all" || account.status === status;
      const matchesQuery = !normalized || [account.email, account.name, ...account.providers]
        .some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [accounts, query, status]);

  return (
    <section className="admin-panel" id="accounts">
      <div className="admin-section-heading">
        <div>
          <span className="admin-kicker">LOGIN ACCOUNTS</span>
          <h2>로그인 계정 관리</h2>
          <p>가입 계정의 로그인 방식과 최근 접속 상태를 확인합니다.</p>
        </div>
        <strong className="admin-count">{accounts.length.toLocaleString("ko-KR")}명</strong>
      </div>

      <div className="account-tools">
        <label>
          <span>계정 검색</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이메일, 이름, 로그인 방식"
            type="search"
            value={query}
          />
        </label>
        <label>
          <span>계정 상태</span>
          <select
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            <option value="all">전체</option>
            <option value="active">정상</option>
            <option value="unconfirmed">확인 전</option>
            <option value="banned">정지</option>
          </select>
        </label>
      </div>

      <div className="account-table-wrap">
        <table className="account-table">
          <thead>
            <tr>
              <th>계정</th>
              <th>로그인 방식</th>
              <th>가입일</th>
              <th>최근 로그인</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {visibleAccounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <strong>{account.name}</strong>
                  <small>{account.email}</small>
                </td>
                <td>
                  <div className="provider-list">
                    {account.providers.map((provider) => (
                      <span key={provider}>{provider}</span>
                    ))}
                  </div>
                </td>
                <td>{dateTime(account.createdAt)}</td>
                <td>{dateTime(account.lastSignInAt)}</td>
                <td>
                  <span className={`account-status is-${account.status}`}>
                    {statusLabels[account.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleAccounts.length === 0 ? (
          <p className="account-empty">조건에 맞는 계정이 없습니다.</p>
        ) : null}
      </div>
    </section>
  );
}
