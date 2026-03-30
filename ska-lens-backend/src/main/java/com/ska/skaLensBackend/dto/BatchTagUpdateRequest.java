package com.ska.skaLensBackend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchTagUpdateRequest {
    @NotEmpty
    private List<String> ids;

    private List<String> tags;
}
