package com.ska.skaLensBackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CommentRequest {
    private String userId;

    /**
     * Compatibility fallback for old clients.
     */
    private String authorName;

    @NotBlank
    private String content;
}
