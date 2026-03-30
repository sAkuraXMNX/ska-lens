package com.ska.skaLensBackend.dto;

import lombok.Data;

import java.util.List;

@Data
public class PhotoUpdateRequest {
    private String title;
    private String description;
    private String albumId;
    private List<String> tags;
    private Boolean published;
}
