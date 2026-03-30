package com.ska.skaLensBackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LikeRequest {
    @NotBlank
    private String userId;
}
