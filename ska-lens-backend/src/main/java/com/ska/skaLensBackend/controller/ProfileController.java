package com.ska.skaLensBackend.controller;

import com.ska.skaLensBackend.dto.PhotoFeedResponse;
import com.ska.skaLensBackend.dto.ProfileResponse;
import com.ska.skaLensBackend.service.ProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse getProfile(@RequestParam(required = false) String username) {
        return profileService.getProfile(username);
    }

    @GetMapping("/photos")
    public PhotoFeedResponse profilePhotos(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "9") int limit
    ) {
        return profileService.getProfilePhotos(username, cursor, limit);
    }
}
