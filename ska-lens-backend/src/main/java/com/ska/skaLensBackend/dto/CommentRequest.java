package com.ska.skaLensBackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CommentRequest {
    @NotBlank
    private String authorName;

    @NotBlank
    private String content;
}
