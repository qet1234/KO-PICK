package com.kopick.couple;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CoupleService {
    private final JdbcTemplate jdbc;
    private final CoupleInviteAttemptService inviteAttempts;
    private final SecureRandom random = new SecureRandom();

    public CoupleService(JdbcTemplate jdbc, CoupleInviteAttemptService inviteAttempts) {
        this.jdbc = jdbc;
        this.inviteAttempts = inviteAttempts;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSpace(UUID userId) {
        List<Map<String, Object>> couples = jdbc.queryForList("""
            select c.id as couple_id,
                   me.role as member_role,
                   (select count(*) from public.couple_members x where x.couple_id = c.id) as member_count,
                   c.invite_expires_at,
                   (c.invite_used_at is not null) as invite_used,
                   c.created_at
              from public.couple_members me
              join public.couples c on c.id = me.couple_id
             where me.user_id = ?
            """, userId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("user_id", userId);
        if (couples.isEmpty()) {
            response.put("couple", null);
            response.put("members", List.of());
            response.put("anniversaries", List.of());
            response.put("events", List.of());
            return response;
        }

        Map<String, Object> couple = couples.get(0);
        UUID coupleId = (UUID) couple.get("couple_id");
        response.put("couple", couple);
        response.put("members", jdbc.queryForList("""
            select user_id, display_name, role, joined_at
              from public.couple_members
             where couple_id = ?
             order by joined_at
            """, coupleId));
        response.put("anniversaries", jdbc.queryForList("""
            select id, couple_id, title, anniversary_date, repeats_yearly, note, created_by
              from public.couple_anniversaries
             where couple_id = ?
             order by anniversary_date
            """, coupleId));
        response.put("events", jdbc.queryForList("""
            select id, couple_id, title, starts_at, ends_at, all_day, location, note, color, created_by
              from public.couple_calendar_events
             where couple_id = ?
             order by starts_at
            """, coupleId));
        return response;
    }

    @Transactional
    public Map<String, Object> create(UUID userId, String displayName) {
        validateName(displayName);
        requireNoMembership(userId);

        UUID coupleId = UUID.randomUUID();
        String inviteCode = inviteCode();
        Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        jdbc.update("""
            insert into public.couples
                (id, created_by, invite_code_hash, invite_expires_at, invite_revoked_at, created_at, updated_at)
            values (?, ?, ?, ?, null, now(), now())
            """, coupleId, userId, sha256(inviteCode), Timestamp.from(expiresAt));
        jdbc.update("""
            insert into public.couple_members (couple_id, user_id, display_name, role, joined_at)
            values (?, ?, ?, 'creator', now())
            """, coupleId, userId, displayName.trim());
        return Map.of(
            "couple_id", coupleId,
            "invite_code", inviteCode,
            "invite_expires_at", expiresAt
        );
    }

    @Transactional
    public void join(UUID userId, String inviteCode, String displayName) {
        validateName(displayName);
        inviteAttempts.requireAvailable(userId);

        String code = inviteCode == null ? "" : inviteCode.replaceAll("\\s+", "").toUpperCase();
        if (!code.matches("^(?:[0-9A-F]{8}|[0-9A-F]{32})$")) {
            inviteAttempts.record(userId, false);
            throw new IllegalArgumentException("초대 코드 형식이 올바르지 않습니다.");
        }

        try {
            requireNoMembership(userId);
            List<Map<String, Object>> rows = jdbc.queryForList("""
                update public.couples c
                   set invite_used_at = now(),
                       invite_revoked_at = now(),
                       invite_code_hash = null,
                       invite_expires_at = null,
                       updated_at = now()
                 where c.invite_code_hash = ?
                   and c.invite_used_at is null
                   and c.invite_revoked_at is null
                   and c.invite_expires_at > now()
                   and (select count(*) from public.couple_members cm where cm.couple_id = c.id) < 2
                returning c.id
                """, sha256(code));
            if (rows.isEmpty()) {
                throw new IllegalArgumentException("초대 코드가 올바르지 않거나 만료되었습니다.");
            }

            UUID coupleId = (UUID) rows.get(0).get("id");
            try {
                jdbc.update("""
                    insert into public.couple_members (couple_id, user_id, display_name, role, joined_at)
                    values (?, ?, ?, 'partner', now())
                    """, coupleId, userId, displayName.trim());
            } catch (DuplicateKeyException error) {
                throw new IllegalStateException("이미 연결된 커플 공간이 있습니다.");
            }
            inviteAttempts.record(userId, true);
        } catch (RuntimeException error) {
            inviteAttempts.record(userId, false);
            throw error;
        }
    }

    @Transactional
    public Map<String, Object> refreshInvite(UUID userId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select c.id
              from public.couples c
             where c.created_by = ?
             for update
            """, userId);
        if (rows.isEmpty()) throw new IllegalStateException("초대 코드를 만들 권한이 없습니다.");
        UUID coupleId = (UUID) rows.get(0).get("id");
        Integer memberCount = jdbc.queryForObject(
            "select count(*) from public.couple_members where couple_id = ?", Integer.class, coupleId
        );
        if (memberCount != null && memberCount >= 2) {
            throw new IllegalStateException("이미 두 사람이 연결되어 있습니다.");
        }

        String code = inviteCode();
        Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        jdbc.update("""
            update public.couples
               set invite_code_hash = ?, invite_expires_at = ?, invite_used_at = null,
                   invite_revoked_at = null, updated_at = now()
             where id = ?
            """, sha256(code), Timestamp.from(expiresAt), coupleId);
        return Map.of("invite_code", code, "invite_expires_at", expiresAt);
    }

    @Transactional
    public void addAnniversary(UUID userId, AnniversaryRequest request) {
        UUID coupleId = requireMembership(userId);
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("기념일 이름을 입력해 주세요.");
        }
        jdbc.update("""
            insert into public.couple_anniversaries
                (id, couple_id, title, anniversary_date, repeats_yearly, note, created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, now(), now())
            """, UUID.randomUUID(), coupleId, request.title().trim(), Date.valueOf(request.anniversaryDate()),
            request.repeatsYearly(), blankToNull(request.note()), userId);
    }

    @Transactional
    public void deleteAnniversary(UUID userId, UUID anniversaryId) {
        UUID coupleId = requireMembership(userId);
        int changed = jdbc.update(
            "delete from public.couple_anniversaries where id = ? and couple_id = ?", anniversaryId, coupleId
        );
        if (changed == 0) throw new IllegalArgumentException("삭제할 기념일을 찾을 수 없습니다.");
    }

    @Transactional
    public void addEvent(UUID userId, EventRequest request) {
        UUID coupleId = requireMembership(userId);
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("일정 이름을 입력해 주세요.");
        }
        if (request.endsAt() != null && request.endsAt().isBefore(request.startsAt())) {
            throw new IllegalArgumentException("종료 시간은 시작 시간보다 늦어야 합니다.");
        }
        String color = request.color() == null ? "red" : request.color();
        if (!List.of("red", "blue", "lime", "pink", "black").contains(color)) {
            throw new IllegalArgumentException("지원하지 않는 일정 색상입니다.");
        }
        jdbc.update("""
            insert into public.couple_calendar_events
                (id, couple_id, title, starts_at, ends_at, all_day, location, note, color,
                 created_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
            """, UUID.randomUUID(), coupleId, request.title().trim(), Timestamp.from(request.startsAt()),
            request.endsAt() == null ? null : Timestamp.from(request.endsAt()), request.allDay(),
            blankToNull(request.location()), blankToNull(request.note()), color, userId);
    }

    @Transactional
    public void deleteEvent(UUID userId, UUID eventId) {
        UUID coupleId = requireMembership(userId);
        int changed = jdbc.update(
            "delete from public.couple_calendar_events where id = ? and couple_id = ?", eventId, coupleId
        );
        if (changed == 0) throw new IllegalArgumentException("삭제할 일정을 찾을 수 없습니다.");
    }

    @Transactional
    public boolean leave(UUID userId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select couple_id from public.couple_members where user_id = ?", userId
        );
        if (rows.isEmpty()) return false;
        jdbc.update("delete from public.couples where id = ?", rows.get(0).get("couple_id"));
        return true;
    }

    private UUID requireMembership(UUID userId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select couple_id from public.couple_members where user_id = ?", userId
        );
        if (rows.isEmpty()) throw new IllegalStateException("연결된 커플 공간이 없습니다.");
        return (UUID) rows.get(0).get("couple_id");
    }

    private void requireNoMembership(UUID userId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from public.couple_members where user_id = ?", Integer.class, userId
        );
        if (count != null && count > 0) throw new IllegalStateException("이미 연결된 커플 공간이 있습니다.");
    }

    private void validateName(String name) {
        if (name == null || name.isBlank() || name.trim().length() > 24) {
            throw new IllegalArgumentException("닉네임은 1자 이상 24자 이하로 입력해 주세요.");
        }
    }

    private String inviteCode() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return HexFormat.of().withUpperCase().formatHex(bytes);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record AnniversaryRequest(
        String title,
        LocalDate anniversaryDate,
        boolean repeatsYearly,
        String note
    ) {}

    public record EventRequest(
        String title,
        Instant startsAt,
        Instant endsAt,
        boolean allDay,
        String location,
        String note,
        String color
    ) {}
}
