package com.kopick.reservation;

import com.kopick.user.AppUser;
import com.kopick.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/web/reservations")
public class ReservationController {
    private final ReservationService reservations;
    private final UserService users;

    public ReservationController(ReservationService reservations, UserService users) {
        this.reservations = reservations;
        this.users = users;
    }

    @GetMapping
    public Map<String, Object> list(
        Authentication authentication,
        @RequestParam(required = false) UUID spaceId
    ) {
        return reservations.list(user(authentication).getId(), spaceId);
    }

    @PostMapping
    public Map<String, Object> create(
        Authentication authentication,
        @Valid @RequestBody CreatePlanRequest request
    ) {
        return reservations.createPlan(user(authentication).getId(), request);
    }

    @DeleteMapping("/{planId}")
    public Map<String, Boolean> delete(
        Authentication authentication,
        @PathVariable UUID planId
    ) {
        reservations.deletePlan(user(authentication).getId(), planId);
        return Map.of("success", true);
    }

    @PostMapping("/{planId}/candidates")
    public Map<String, Object> addCandidate(
        Authentication authentication,
        @PathVariable UUID planId,
        @Valid @RequestBody CandidateRequest request
    ) {
        return reservations.addCandidate(user(authentication).getId(), planId, request);
    }

    @PostMapping("/candidates/{candidateId}/vote")
    public Map<String, Object> toggleVote(
        Authentication authentication,
        @PathVariable UUID candidateId
    ) {
        return reservations.toggleVote(user(authentication).getId(), candidateId);
    }

    @PostMapping("/{planId}/finalize")
    public Map<String, Object> finalizePlan(
        Authentication authentication,
        @PathVariable UUID planId,
        @Valid @RequestBody FinalizeRequest request
    ) {
        return reservations.finalizePlan(
            user(authentication).getId(),
            planId,
            request.candidateId()
        );
    }

    @PatchMapping("/{planId}/status")
    public Map<String, Object> updateStatus(
        Authentication authentication,
        @PathVariable UUID planId,
        @Valid @RequestBody StatusRequest request
    ) {
        return reservations.updateStatus(user(authentication).getId(), planId, request.status());
    }

    private AppUser user(Authentication authentication) {
        return users.resolve(authentication);
    }

    public record CreatePlanRequest(
        @NotNull UUID spaceId,
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 40) String purpose,
        @NotNull LocalDate reservationDate,
        @Min(1) @Max(50) int partySize,
        @Min(0) @Max(10_000_000) Integer budgetPerPerson,
        @Size(max = 1000) String note
    ) {}

    public record CandidateRequest(
        @Size(max = 30) String placeSource,
        @Size(max = 160) String placeId,
        @NotBlank @Size(max = 120) String placeName,
        @Size(max = 40) String category,
        @Size(max = 240) String address,
        @NotNull Instant startsAt,
        @Size(max = 1000) String externalReservationUrl
    ) {}

    public record FinalizeRequest(@NotNull UUID candidateId) {}

    public record StatusRequest(@NotBlank String status) {}
}
