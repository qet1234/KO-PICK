package com.kopick.space;

import com.kopick.user.AppUser;
import com.kopick.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/web/spaces")
public class SpaceController {
    private final SpaceService spaces;
    private final UserService users;

    public SpaceController(SpaceService spaces, UserService users) {
        this.spaces = spaces;
        this.users = users;
    }

    @GetMapping
    public Map<String, Object> list(Authentication authentication) {
        AppUser user = user(authentication);
        return spaces.list(user.getId(), user.getDisplayName());
    }

    @PostMapping
    public Map<String, Object> create(
        Authentication authentication,
        @Valid @RequestBody CreateRequest request
    ) {
        return spaces.create(
            user(authentication).getId(),
            request.type(),
            request.name(),
            request.displayName()
        );
    }

    @PostMapping("/join")
    public Map<String, Object> join(
        Authentication authentication,
        @Valid @RequestBody JoinRequest request
    ) {
        return spaces.join(user(authentication).getId(), request.inviteCode(), request.displayName());
    }

    @PostMapping("/{spaceId}/invite")
    public Map<String, Object> refreshInvite(
        Authentication authentication,
        @PathVariable UUID spaceId
    ) {
        return spaces.refreshInvite(user(authentication).getId(), spaceId);
    }

    @DeleteMapping("/{spaceId}")
    public Map<String, Boolean> leave(
        Authentication authentication,
        @PathVariable UUID spaceId
    ) {
        spaces.leave(user(authentication).getId(), spaceId);
        return Map.of("success", true);
    }

    private AppUser user(Authentication authentication) {
        return users.resolve(authentication);
    }

    public record CreateRequest(
        @NotBlank String type,
        @NotBlank String name,
        @NotBlank String displayName
    ) {}

    public record JoinRequest(
        @NotBlank String inviteCode,
        @NotBlank String displayName
    ) {}
}
