package com.ska.skaLensBackend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "photos")
public class Photo {

    @Id
    private String id;

    private String title;
    private String description;

    private String imageUrl;
    private String thumbnailUrl;

    /**
     * Weak association by string id to keep NoSQL model flexible.
     */
    private String albumId;

    private List<String> tags;

    private ExifInfo exif;

    @Builder.Default
    private List<String> likedBy = List.of();

    @Builder.Default
    private long likeCount = 0L;

    @Builder.Default
    private long commentCount = 0L;

    @Builder.Default
    private boolean published = true;

    private Instant createdAt;
    private Instant updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExifInfo {
        private String cameraModel;
        private String lensModel;
        private String aperture;
        private String shutterSpeed;
        private Integer iso;
        private String focalLength;
        private String capturedAt;
    }
}
