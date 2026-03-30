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
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String username;
    private String passwordHash;
    private String displayName;
    private String bio;
    private String avatarUrl;

    @Builder.Default
    private List<Role> roles = List.of(Role.ADMIN);

    private Instant createdAt;
    private Instant updatedAt;

    public enum Role {
        ADMIN,
        EDITOR
    }
}
