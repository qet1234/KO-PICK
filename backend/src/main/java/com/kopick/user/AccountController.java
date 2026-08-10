package com.kopick.user;

import com.kopick.auth.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/web/account")
public class AccountController {
    private final UserService users;
    private final RefreshTokenService refreshTokens;

    public AccountController(
        UserService users,
        RefreshTokenService refreshTokens
    ) {
        this.users = users;
        this.refreshTokens = refreshTokens;
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(Authentication authentication, HttpServletRequest request) {
        AppUser user = users.resolve(authentication);
        refreshTokens.revokeAll(user);
        users.delete(user);
        if (request.getSession(false) != null) request.getSession(false).invalidate();
        return Map.of("success", true, "message", "회원정보와 연결 데이터가 삭제되었습니다.");
    }
}
