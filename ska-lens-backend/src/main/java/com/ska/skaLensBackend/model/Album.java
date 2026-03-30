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
@Document(collection = "albums")
public class Album {

    @Id
    private String id;

    private String name;
    private String description;

    private Visibility visibility;

    /**
     * Optional simple access code for private album.
     */
    private String accessCode;

    @Builder.Default
    private List<String> tags = List.of();

    private String coverPhotoId;

    private Instant createdAt;
    private Instant updatedAt;

    public enum Visibility {
        PUBLIC,
        PRIVATE
    }
}
