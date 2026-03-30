package com.ska.skaLensBackend.service;

import com.ska.skaLensBackend.dto.PhotoFeedResponse;
import com.ska.skaLensBackend.dto.ProfileResponse;
import com.ska.skaLensBackend.model.User;
import com.ska.skaLensBackend.repository.AlbumRepository;
import com.ska.skaLensBackend.repository.PhotoRepository;
import com.ska.skaLensBackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final AlbumRepository albumRepository;
    private final PhotoService photoService;

    public ProfileService(
            UserRepository userRepository,
            PhotoRepository photoRepository,
            AlbumRepository albumRepository,
            PhotoService photoService
    ) {
        this.userRepository = userRepository;
        this.photoRepository = photoRepository;
        this.albumRepository = albumRepository;
        this.photoService = photoService;
    }

    public ProfileResponse getProfile(String username) {
        User user = resolveUser(username);
        long totalLikes = photoRepository.findAllByOrderByCreatedAtDesc().stream()
                .mapToLong(photo -> photo.getLikeCount())
                .sum();
        return ProfileResponse.builder()
                .username(user.getUsername())
                .displayName(StringUtils.hasText(user.getDisplayName()) ? user.getDisplayName() : user.getUsername())
                .bio(StringUtils.hasText(user.getBio()) ? user.getBio() : "欢迎来到我的摄影主页")
                .avatarUrl(StringUtils.hasText(user.getAvatarUrl()) ? user.getAvatarUrl() : null)
                .totalLikes(totalLikes)
                .albumCount(albumRepository.count())
                .build();
    }

    public PhotoFeedResponse getProfilePhotos(String username, String cursor, int limit) {
        resolveUser(username);
        return photoService.listFeed(cursor, limit, null, null, false);
    }

    private User resolveUser(String username) {
        if (StringUtils.hasText(username)) {
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        }
        return userRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }
}
