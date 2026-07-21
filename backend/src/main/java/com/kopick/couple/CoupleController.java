package com.kopick.couple;

import com.kopick.user.AppUser;
import com.kopick.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/web/couple")
public class CoupleController {
    private final CoupleService couples;
    private final UserService users;

    public CoupleController(CoupleService couples, UserService users) {
        this.couples = couples;
        this.users = users;
    }

    @GetMapping
    public Map<String, Object> get(Authentication authentication) {
        return couples.getSpace(user(authentication).getId());
    }

    @PostMapping
    public Map<String, Object> create(
        Authentication authentication,
        @Valid @RequestBody CreateRequest request
    ) {
        return couples.create(user(authentication).getId(), request.displayName());
    }

    @PostMapping("/join")
    public Map<String, Boolean> join(
        Authentication authentication,
        @Valid @RequestBody JoinRequest request
    ) {
        couples.join(user(authentication).getId(), request.inviteCode(), request.displayName());
        return Map.of("success", true);
    }

    @PostMapping("/invite")
    public Map<String, Object> refreshInvite(Authentication authentication) {
        return couples.refreshInvite(user(authentication).getId());
    }

    @PostMapping("/anniversaries")
    public Map<String, Boolean> addAnniversary(
        Authentication authentication,
        @Valid @RequestBody CoupleService.AnniversaryRequest request
    ) {
        couples.addAnniversary(user(authentication).getId(), request);
        return Map.of("success", true);
    }

    @DeleteMapping("/anniversaries/{id}")
    public Map<String, Boolean> deleteAnniversary(
        Authentication authentication,
        @PathVariable UUID id
    ) {
        couples.deleteAnniversary(user(authentication).getId(), id);
        return Map.of("success", true);
    }

    @PostMapping("/events")
    public Map<String, Boolean> addEvent(
        Authentication authentication,
        @Valid @RequestBody CoupleService.EventRequest request
    ) {
        couples.addEvent(user(authentication).getId(), request);
        return Map.of("success", true);
    }

    @DeleteMapping("/events/{id}")
    public Map<String, Boolean> deleteEvent(
        Authentication authentication,
        @PathVariable UUID id
    ) {
        couples.deleteEvent(user(authentication).getId(), id);
        return Map.of("success", true);
    }

    @DeleteMapping
    public Map<String, Object> leave(Authentication authentication) {
        boolean deleted = couples.leave(user(authentication).getId());
        return Map.of("success", true, "alreadyLeft", !deleted);
    }

    private AppUser user(Authentication authentication) {
        return users.resolve(authentication);
    }

    public record CreateRequest(
        @NotBlank @Size(max = 24) String displayName
    ) {}

    public record JoinRequest(
        @NotBlank
        @Pattern(regexp = "(?i)^[0-9a-f\\s]{32,48}$", message = "초대 코드 형식이 올바르지 않습니다.")
        String inviteCode,
        @NotBlank @Size(max = 24) String displayName
    ) {}
}
