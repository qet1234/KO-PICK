package com.kopick.space;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpaceInviteAttemptService {
    private static final int MAX_ATTEMPTS = 10;
    private final JdbcTemplate jdbc;

    public SpaceInviteAttemptService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void requireAvailable(UUID userId) {
        Integer attempts = jdbc.queryForObject("""
            select count(*)
              from public.space_invite_attempts
             where user_id = ?
               and attempted_at >= now() - interval '15 minutes'
            """, Integer.class, userId);
        if (attempts != null && attempts >= MAX_ATTEMPTS) {
            throw new IllegalStateException("초대 코드 입력 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.");
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID userId, boolean succeeded) {
        jdbc.update("""
            insert into public.space_invite_attempts(user_id, attempted_at, succeeded)
            values (?, now(), ?)
            """, userId, succeeded);
        jdbc.update("delete from public.space_invite_attempts where attempted_at < now() - interval '30 days'");
    }
}
