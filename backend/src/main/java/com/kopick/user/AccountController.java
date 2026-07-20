package com.kopick.user;

import com.kopick.auth.RefreshTokenService;
import com.kopick.couple.CoupleService;
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
    private final CoupleService couples;

    public AccountController(
        UserService users,
        RefreshTokenService refreshTokens,
        CoupleService couples
    ) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.couples = couples;
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(Authentication authentication, HttpServletRequest request) {
        AppUser user = users.resolve(authentication);
        refreshTokens.revokeAll(user);
        couples.leave(user.getId());
        users.delete(user);
        if (request.getSession(false) != null) request.getSession(false).invalidate();
        return Map.of("success", true, "message", "회원정보와 연결 데이터가 삭제되었습니다.");
    }
}
