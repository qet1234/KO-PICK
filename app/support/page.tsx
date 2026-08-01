const supportEmail = "jjs092200@gmail.com";

function gmailComposeUrl(type: "inquiry" | "feedback") {
  const isFeedback = type === "feedback";
  const subject = isFeedback ? "[코리아픽 테스트 피드백]" : "[KO-PICK 테스트 문의]";
  const body = isFeedback
    ? "코리아픽 테스트 중 느낀 점이나 개선 의견을 적어 주세요.\n\n사용 기기:\n의견:"
    : "KO-PICK 이용 중 궁금한 점이나 문제를 적어 주세요.\n\n사용 기기:\n문의 내용:";

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    to: supportEmail,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

export default function SupportPage() {
  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 코리아픽 홈</a>
          <small>TEST SUPPORT</small>
          <h1>고객지원</h1>
          <p>테스트 기간의 문의와 피드백은 KO-PICK 담당자 Gmail로 접수합니다.</p>
        </header>
        <div className="legal-content">
          <section>
            <h2>담당자 이메일</h2>
            <p>
              <a href={gmailComposeUrl("inquiry")} target="_blank" rel="noreferrer">
                {supportEmail}
              </a>
            </p>
            <div className="legal-actions">
              <a href={gmailComposeUrl("inquiry")} target="_blank" rel="noreferrer">
                문의 접수
              </a>
              <a href={gmailComposeUrl("feedback")} target="_blank" rel="noreferrer">
                피드백 보내기
              </a>
            </div>
            <p className="legal-note">
              버튼을 누르면 Google Gmail 작성 화면이 열리고 수신자와 제목이 자동 입력됩니다.
              내용을 작성한 뒤 보내기를 눌러야 접수가 완료됩니다. 접수된 메일과 첨부파일은
              문의 종결일부터 1년 동안 보관한 뒤 삭제합니다.
            </p>
          </section>

          <section>
            <h2>접수할 때 확인해 주세요</h2>
            <ul>
              <li>오류 문의에는 사용 기기, 발생 화면, 재현 과정을 함께 적어 주세요.</li>
              <li>비밀번호, 인증번호, 주민등록번호, 결제정보 등 민감한 정보는 보내지 마세요.</li>
              <li>화면 캡처를 첨부할 때는 개인 이메일과 소셜 계정 정보가 보이지 않도록 가려 주세요.</li>
              <li>답변은 메일을 보낸 주소로 전달됩니다.</li>
            </ul>
          </section>
        </div>
      </article>
    </main>
  );
}
