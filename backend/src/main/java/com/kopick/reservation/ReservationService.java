package com.kopick.reservation;

import java.net.URI;
import java.net.URISyntaxException;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {
    private static final Set<String> EDITABLE_STATUSES = Set.of("requested", "confirmed", "cancelled");
    private static final Set<String> TERMINAL_STATUSES = Set.of("confirmed", "cancelled");
    private static final Set<String> COLLABORATIVE_STATUSES = Set.of("voting", "ready");
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");
    private final JdbcTemplate jdbc;

    public ReservationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(UUID userId, UUID spaceId) {
        List<Object> parameters = new ArrayList<>();
        parameters.add(userId);
        parameters.add(userId);
        String spaceFilter = "";
        if (spaceId != null) {
            spaceFilter = " and p.space_id = ?";
            parameters.add(spaceId);
        }

        List<Map<String, Object>> planRows = jdbc.queryForList("""
            select p.id, p.space_id, s.name as space_name, s.space_type,
                   p.title, p.purpose, to_char(p.reservation_date, 'YYYY-MM-DD') as reservation_date,
                   p.party_size,
                   p.budget_per_person, p.note, p.status, p.created_by,
                   (p.created_by = ?) as can_manage, p.created_at, p.updated_at
              from public.space_reservation_plans p
              join public.spaces s on s.id = p.space_id
              join public.space_members me on me.space_id = p.space_id
             where me.user_id = ?
            """
            + spaceFilter
            + " order by p.reservation_date desc, p.created_at desc",
            parameters.toArray());

        List<Map<String, Object>> plans = new ArrayList<>();
        for (Map<String, Object> row : planRows) {
            UUID planId = (UUID) row.get("id");
            Map<String, Object> plan = new LinkedHashMap<>(row);
            List<Map<String, Object>> candidates = jdbc.queryForList("""
                select c.id, c.plan_id, c.place_source, c.place_id, c.place_name,
                       c.category, c.address, c.starts_at, c.external_reservation_url,
                       c.is_selected, c.created_by, c.created_at,
                       count(v.user_id) as vote_count,
                       coalesce(bool_or(v.user_id = ?), false) as voted_by_me
                  from public.space_reservation_candidates c
                  left join public.space_reservation_votes v on v.candidate_id = c.id
                 where c.plan_id = ?
                 group by c.id
                 order by c.is_selected desc, vote_count desc, c.created_at
                """, userId, planId);
            for (Map<String, Object> candidate : candidates) {
                candidate.put("voters", jdbc.queryForList("""
                    select sm.display_name
                      from public.space_reservation_votes v
                      join public.space_reservation_candidates c on c.id = v.candidate_id
                      join public.space_reservation_plans p on p.id = c.plan_id
                      join public.space_members sm
                        on sm.space_id = p.space_id and sm.user_id = v.user_id
                     where v.candidate_id = ?
                     order by v.created_at
                    """, candidate.get("id")));
            }
            plan.put("candidates", candidates);
            plans.add(plan);
        }

        return Map.of("user_id", userId, "plans", plans);
    }

    @Transactional
    public Map<String, Object> createPlan(
        UUID userId,
        ReservationController.CreatePlanRequest request
    ) {
        requireSpaceMember(request.spaceId(), userId);
        if (request.reservationDate().isBefore(LocalDate.now(SERVICE_ZONE))) {
            throw new IllegalArgumentException("예약 날짜는 오늘 이후로 선택해 주세요.");
        }
        UUID planId = UUID.randomUUID();
        jdbc.update("""
            insert into public.space_reservation_plans (
                id, space_id, title, purpose, reservation_date, party_size,
                budget_per_person, note, status, created_by, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, 'voting', ?, now(), now())
            """, planId, request.spaceId(), request.title().trim(), request.purpose().trim(),
            Date.valueOf(request.reservationDate()), request.partySize(), request.budgetPerPerson(),
            trimToNull(request.note()), userId);
        return Map.of("plan_id", planId, "status", "voting");
    }

    @Transactional
    public Map<String, Object> addCandidate(
        UUID userId,
        UUID planId,
        ReservationController.CandidateRequest request
    ) {
        Map<String, Object> plan = requirePlanMember(planId, userId);
        if (!COLLABORATIVE_STATUSES.contains(String.valueOf(plan.get("status")))) {
            throw new IllegalStateException("예약 요청 전 단계에서만 후보를 추가할 수 있습니다.");
        }
        validateExternalUrl(request.externalReservationUrl());
        LocalDate candidateDate = request.startsAt().atZone(SERVICE_ZONE).toLocalDate();
        LocalDate planDate = ((Date) plan.get("reservation_date")).toLocalDate();
        if (!candidateDate.equals(planDate)) {
            throw new IllegalArgumentException("후보 방문 시간은 예약 계획 날짜와 같아야 합니다.");
        }
        Integer candidateCount = jdbc.queryForObject(
            "select count(*) from public.space_reservation_candidates where plan_id = ?",
            Integer.class,
            planId
        );
        if (candidateCount != null && candidateCount >= 20) {
            throw new IllegalStateException("하나의 예약 계획에는 후보를 최대 20곳까지 추가할 수 있습니다.");
        }

        UUID candidateId = UUID.randomUUID();
        jdbc.update("""
            insert into public.space_reservation_candidates (
                id, plan_id, place_source, place_id, place_name, category,
                address, starts_at, external_reservation_url, created_by, created_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
            """, candidateId, planId, normalizeSource(request.placeSource()),
            trimToNull(request.placeId()), request.placeName().trim(),
            trimToNull(request.category()), trimToNull(request.address()),
            Timestamp.from(request.startsAt()), trimToNull(request.externalReservationUrl()), userId);
        return Map.of("candidate_id", candidateId);
    }

    @Transactional
    public Map<String, Object> toggleVote(UUID userId, UUID candidateId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select p.space_id, p.status
              from public.space_reservation_candidates c
              join public.space_reservation_plans p on p.id = c.plan_id
             where c.id = ?
            """, candidateId);
        if (rows.isEmpty()) throw new IllegalArgumentException("예약 후보를 찾을 수 없습니다.");
        requireSpaceMember((UUID) rows.get(0).get("space_id"), userId);
        if (!COLLABORATIVE_STATUSES.contains(String.valueOf(rows.get(0).get("status")))) {
            throw new IllegalStateException("예약 요청 전 단계에서만 투표할 수 있습니다.");
        }

        int removed = jdbc.update(
            "delete from public.space_reservation_votes where candidate_id = ? and user_id = ?",
            candidateId, userId
        );
        boolean voted = removed == 0;
        if (voted) {
            jdbc.update("""
                insert into public.space_reservation_votes (candidate_id, user_id, created_at)
                values (?, ?, now())
                on conflict do nothing
                """, candidateId, userId);
        }
        return Map.of("voted", voted);
    }

    @Transactional
    public Map<String, Object> finalizePlan(UUID userId, UUID planId, UUID candidateId) {
        Map<String, Object> plan = requireManageablePlan(planId, userId);
        if (!COLLABORATIVE_STATUSES.contains(String.valueOf(plan.get("status")))) {
            throw new IllegalStateException("예약 요청 전 단계에서만 최종 장소를 변경할 수 있습니다.");
        }
        List<Map<String, Object>> candidates = jdbc.queryForList("""
            select id, place_name, address, starts_at, external_reservation_url
              from public.space_reservation_candidates
             where id = ? and plan_id = ?
             for update
            """, candidateId, planId);
        if (candidates.isEmpty()) throw new IllegalArgumentException("선택할 예약 후보를 찾을 수 없습니다.");

        jdbc.update("update public.space_reservation_candidates set is_selected = false where plan_id = ?", planId);
        jdbc.update("update public.space_reservation_candidates set is_selected = true where id = ?", candidateId);
        jdbc.update("""
            update public.space_reservation_plans
               set status = 'ready', updated_at = now()
             where id = ?
            """, planId);

        Map<String, Object> candidate = candidates.get(0);
        UUID eventId = UUID.randomUUID();
        jdbc.update("""
            insert into public.space_calendar_events (
                id, space_id, title, starts_at, all_day, location, note, color,
                created_by, created_at, updated_at, reservation_plan_id
            ) values (?, ?, ?, ?, false, ?, ?, 'blue', ?, now(), now(), ?)
            on conflict (reservation_plan_id) where reservation_plan_id is not null
            do update set title = excluded.title, starts_at = excluded.starts_at,
                          location = excluded.location, note = excluded.note,
                          updated_at = now()
            """, eventId, plan.get("space_id"), "[함께 예약] " + plan.get("title"),
            candidate.get("starts_at"), candidate.get("address"),
            "선택 장소: " + candidate.get("place_name"), userId, planId);

        return Map.of("status", "ready", "candidate_id", candidateId, "calendar_saved", true);
    }

    @Transactional
    public Map<String, Object> updateStatus(UUID userId, UUID planId, String requestedStatus) {
        String status = requestedStatus == null ? "" : requestedStatus.trim().toLowerCase();
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new IllegalArgumentException("예약 요청 중, 예약 확정 또는 취소 상태만 선택할 수 있습니다.");
        }
        Map<String, Object> plan = requireManageablePlan(planId, userId);
        if (!"cancelled".equals(status) && !hasSelectedCandidate(planId)) {
            throw new IllegalStateException("먼저 투표 결과에서 최종 장소를 확정해 주세요.");
        }
        String currentStatus = String.valueOf(plan.get("status"));
        boolean allowed =
            ("requested".equals(status) && "ready".equals(currentStatus))
                || ("confirmed".equals(status) && "requested".equals(currentStatus))
                || ("cancelled".equals(status) && !TERMINAL_STATUSES.contains(currentStatus));
        if (!allowed) {
            throw new IllegalStateException("현재 단계에서는 선택한 예약 상태로 변경할 수 없습니다.");
        }
        jdbc.update("""
            update public.space_reservation_plans set status = ?, updated_at = now() where id = ?
            """, status, planId);
        return Map.of("status", status);
    }

    @Transactional
    public void deletePlan(UUID userId, UUID planId) {
        requireManageablePlan(planId, userId);
        jdbc.update("delete from public.space_reservation_plans where id = ?", planId);
    }

    private Map<String, Object> requirePlanMember(UUID planId, UUID userId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            select p.id, p.space_id, p.title, p.status, p.reservation_date, p.created_by
              from public.space_reservation_plans p
              join public.space_members me on me.space_id = p.space_id
             where p.id = ? and me.user_id = ?
            """, planId, userId);
        if (rows.isEmpty()) throw new IllegalArgumentException("접근할 수 있는 예약 계획을 찾지 못했습니다.");
        return rows.get(0);
    }

    private Map<String, Object> requireManageablePlan(UUID planId, UUID userId) {
        Map<String, Object> plan = requirePlanMember(planId, userId);
        if (!userId.equals(plan.get("created_by"))) {
            throw new IllegalStateException("예약 계획을 만든 대표자만 최종 상태를 변경할 수 있습니다.");
        }
        return plan;
    }

    private void requireSpaceMember(UUID spaceId, UUID userId) {
        Integer count = jdbc.queryForObject("""
            select count(*) from public.space_members where space_id = ? and user_id = ?
            """, Integer.class, spaceId, userId);
        if (count == null || count == 0) {
            throw new IllegalArgumentException("참여 중인 공간을 찾을 수 없습니다.");
        }
    }

    private boolean hasSelectedCandidate(UUID planId) {
        Integer count = jdbc.queryForObject("""
            select count(*) from public.space_reservation_candidates
             where plan_id = ? and is_selected = true
            """, Integer.class, planId);
        return count != null && count > 0;
    }

    private void validateExternalUrl(String value) {
        if (value == null || value.isBlank()) return;
        try {
            URI uri = new URI(value.trim());
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null) {
                throw new IllegalArgumentException("외부 예약 링크는 올바른 http 또는 https 주소여야 합니다.");
            }
        } catch (URISyntaxException error) {
            throw new IllegalArgumentException("외부 예약 링크 형식이 올바르지 않습니다.");
        }
    }

    private String normalizeSource(String source) {
        String normalized = trimToNull(source);
        return normalized == null ? "manual" : normalized.toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
