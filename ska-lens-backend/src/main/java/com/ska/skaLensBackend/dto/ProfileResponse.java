package com.ska.skaLensBackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private String username;
    private String displayName;
    private String bio;
    private String avatarUrl;
    private long totalLikes;
    private long albumCount;
}
