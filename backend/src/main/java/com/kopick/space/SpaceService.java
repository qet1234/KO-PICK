package com.kopick.space;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpaceService {
    private static final Set<String> GROUP_TYPES = Set.of("couple", "friends", "family");
    private final JdbcTemplate jdbc;
    private final SpaceInviteAttemptService inviteAttempts;
    private final SecureRandom random = new SecureRandom();

    public SpaceService(JdbcTemplate jdbc, SpaceInviteAttemptService inviteAttempts) {
        this.jdbc = jdbc;
        this.inviteAttempts = inviteAttempts;
    }

    @Transactional
    public Map<String, Object> list(UUID userId, String accountDisplayName) {
        ensurePersonalSpace(userId, accountDisplayName);

        List<Map<String, Object>> spaces = jdbc.queryForList("""
            select s.id, s.space_type, s.name, me.role as member_role,
                   (select count(*) from public.space_members sm where sm.space_id = s.id) as member_count,
                   s.invite_expires_at, s.created_at,
                   (s.id in (select c.id from public.couples c)) as legacy_couple
              from public.space_members me
              join public.spaces s on s.id = me.space_id
             where me.user_id = ?
             order by case s.space_type
                        when 'personal' then 0
                        when 'couple' then 1
                        when 'friends' then 2
                        else 3
                      end,
                      s.created_at desc
            """, userId);

        return Map.of("user_id", userId, "spaces", spaces);
    }

    @Transactional
    public Map<String, Object> create(
        UUID userId,
        String type,
        String name,
        String displayName
    ) {
        String normalizedType = normalizeType(type);
        validateName(name, "공간 이름", 80);
        validateName(displayName, "닉네임", 24);

        if ("couple".equals(normalizedType) && hasSpaceType(userId, "couple")) {
            throw new IllegalStateException("이미 참여 중인 커플 공간이 있습니다.");
        }

        UUID spaceId = UUID.randomUUID();
        String inviteCode = inviteCode();
        Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        jdbc.update("""
            insert into public.spaces (
                id, space_type, name, created_by, invite_code_hash,
                invite_expires_at, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, now(), now())
            """, spaceId, normalizedType, name.trim(), userId, sha256(inviteCode), Timestamp.from(expiresAt));
        jdbc.update("""
            insert into public.space_members (space_id, user_id, display_name, role, joined_at)
            values (?, ?, ?, 'owner', now())
            """, spaceId, userId, displayName.trim());

        return Map.of(
            "space_id", spaceId,
            "invite_code", inviteCode,
            "invite_expires_at", expiresAt
        );
    }

    @Transactional
    public Map<String, Object> refreshInvite(UUID userId, UUID spaceId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select s.space_type
              from public.spaces s
              join public.space_members me on me.space_id = s.id
             where s.id = ? and me.user_id = ? and me.role = 'owner'
             for update
            """, spaceId, userId);
        if (rows.isEmpty()) throw new IllegalStateException("초대 코드를 만들 권한이 없습니다.");
        if ("personal".equals(rows.get(0).get("space_type"))) {
            throw new IllegalArgumentException("개인 공간에는 다른 사람을 초대할 수 없습니다.");
        }

        int memberCount = memberCount(spaceId);
        int memberLimit = memberLimit(String.valueOf(rows.get(0).get("space_type")));
        if (memberCount >= memberLimit) throw new IllegalStateException("이 공간의 참여 인원이 모두 찼습니다.");

        String code = inviteCode();
        Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        jdbc.update("""
            update public.spaces
               set invite_code_hash = ?, invite_expires_at = ?, invite_used_at = null,
                   invite_revoked_at = null, updated_at = now()
             where id = ?
            """, sha256(code), Timestamp.from(expiresAt), spaceId);
        return Map.of("invite_code", code, "invite_expires_at", expiresAt);
    }

    @Transactional
    public Map<String, Object> join(UUID userId, String inviteCode, String displayName) {
        validateName(displayName, "닉네임", 24);
        inviteAttempts.requireAvailable(userId);

        String code = inviteCode == null ? "" : inviteCode.replaceAll("\\s+", "").toUpperCase();
        if (!code.matches("^[0-9A-F]{32}$")) {
            inviteAttempts.record(userId, false);
            throw new IllegalArgumentException("초대 코드는 영문 대문자와 숫자로 된 32자리입니다.");
        }

        try {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, space_type
                  from public.spaces
                 where invite_code_hash = ?
                   and invite_used_at is null
                   and invite_revoked_at is null
                   and invite_expires_at > now()
                 for update
                """, sha256(code));
            if (rows.isEmpty()) throw new IllegalArgumentException("초대 코드가 올바르지 않거나 만료되었습니다.");

            UUID spaceId = (UUID) rows.get(0).get("id");
            String type = String.valueOf(rows.get(0).get("space_type"));
            if ("couple".equals(type) && hasSpaceType(userId, "couple")) {
                throw new IllegalStateException("이미 참여 중인 커플 공간이 있습니다.");
            }
            if (isMember(spaceId, userId)) throw new IllegalStateException("이미 참여 중인 공간입니다.");
            if (memberCount(spaceId) >= memberLimit(type)) {
                throw new IllegalStateException("이 공간의 참여 인원이 모두 찼습니다.");
            }

            jdbc.update("""
                insert into public.space_members (space_id, user_id, display_name, role, joined_at)
                values (?, ?, ?, 'member', now())
                """, spaceId, userId, displayName.trim());
            jdbc.update("""
                update public.spaces
                   set invite_used_at = now(), invite_revoked_at = now(),
                       invite_code_hash = null, invite_expires_at = null, updated_at = now()
                 where id = ?
                """, spaceId);
            inviteAttempts.record(userId, true);
            return Map.of("space_id", spaceId);
        } catch (RuntimeException error) {
            inviteAttempts.record(userId, false);
            throw error;
        }
    }

    @Transactional
    public void leave(UUID userId, UUID spaceId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select s.space_type, me.role
              from public.spaces s
              join public.space_members me on me.space_id = s.id
             where s.id = ? and me.user_id = ?
             for update
            """, spaceId, userId);
        if (rows.isEmpty()) throw new IllegalArgumentException("참여 중인 공간을 찾을 수 없습니다.");
        if ("personal".equals(rows.get(0).get("space_type"))) {
            throw new IllegalArgumentException("기본 개인 공간은 삭제할 수 없습니다.");
        }

        if ("owner".equals(rows.get(0).get("role"))) {
            jdbc.update("delete from public.spaces where id = ?", spaceId);
        } else {
            jdbc.update("delete from public.space_members where space_id = ? and user_id = ?", spaceId, userId);
        }
    }

    private void ensurePersonalSpace(UUID userId, String accountDisplayName) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select id from public.spaces where created_by = ? and space_type = 'personal'
            """, userId);
        UUID spaceId;
        if (rows.isEmpty()) {
            spaceId = UUID.randomUUID();
            int changed = jdbc.update("""
                insert into public.spaces (id, space_type, name, created_by, created_at, updated_at)
                values (?, 'personal', '나의 공간', ?, now(), now())
                on conflict do nothing
                """, spaceId, userId);
            if (changed == 0) {
                spaceId = jdbc.queryForObject("""
                    select id from public.spaces where created_by = ? and space_type = 'personal'
                    """, UUID.class, userId);
            }
        } else {
            spaceId = (UUID) rows.get(0).get("id");
        }

        jdbc.update("""
            insert into public.space_members (space_id, user_id, display_name, role, joined_at)
            values (?, ?, ?, 'owner', now())
            on conflict (space_id, user_id) do nothing
            """, spaceId, userId, normalizedDisplayName(accountDisplayName));
    }

    private String normalizeType(String type) {
        String normalized = type == null ? "" : type.trim().toLowerCase();
        if (!GROUP_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("커플, 친구 또는 가족 공간을 선택해 주세요.");
        }
        return normalized;
    }

    private boolean hasSpaceType(UUID userId, String type) {
        Integer count = jdbc.queryForObject("""
            select count(*)
              from public.space_members me
              join public.spaces s on s.id = me.space_id
             where me.user_id = ? and s.space_type = ?
            """, Integer.class, userId, type);
        return count != null && count > 0;
    }

    private boolean isMember(UUID spaceId, UUID userId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from public.space_members where space_id = ? and user_id = ?",
            Integer.class, spaceId, userId
        );
        return count != null && count > 0;
    }

    private int memberCount(UUID spaceId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from public.space_members where space_id = ?", Integer.class, spaceId
        );
        return count == null ? 0 : count;
    }

    private int memberLimit(String type) {
        return "couple".equals(type) ? 2 : 20;
    }

    private void validateName(String value, String label, int maxLength) {
        if (value == null || value.isBlank() || value.trim().length() > maxLength) {
            throw new IllegalArgumentException(label + "은(는) 1자 이상 " + maxLength + "자 이하로 입력해 주세요.");
        }
    }

    private String normalizedDisplayName(String value) {
        if (value == null || value.isBlank()) return "나";
        String trimmed = value.trim();
        return trimmed.length() <= 24 ? trimmed : trimmed.substring(0, 24);
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
}
