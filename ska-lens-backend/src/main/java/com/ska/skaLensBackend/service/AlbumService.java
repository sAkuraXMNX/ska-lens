package com.ska.skaLensBackend.service;

import com.ska.skaLensBackend.dto.AlbumRequest;
import com.ska.skaLensBackend.model.Album;
import com.ska.skaLensBackend.repository.AlbumRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class AlbumService {

    private final AlbumRepository albumRepository;

    public AlbumService(AlbumRepository albumRepository) {
        this.albumRepository = albumRepository;
    }

    public List<Album> listPublic() {
        return albumRepository.findByVisibility(Album.Visibility.PUBLIC);
    }

    public List<Album> listAll() {
        return albumRepository.findAll();
    }

    public Album getById(String id, boolean admin, String accessCode) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Album not found"));

        if (album.getVisibility() == Album.Visibility.PRIVATE && !admin) {
            if (album.getAccessCode() == null || !album.getAccessCode().equals(accessCode)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Private album requires access code");
            }
        }
        return album;
    }

    public Album create(@Valid AlbumRequest request) {
        Instant now = Instant.now();
        Album album = Album.builder()
                .name(request.getName())
                .description(request.getDescription())
                .visibility(request.getVisibility())
                .accessCode(request.getVisibility() == Album.Visibility.PRIVATE ? request.getAccessCode() : null)
                .tags(request.getTags() == null ? List.of() : request.getTags())
                .coverPhotoId(request.getCoverPhotoId())
                .createdAt(now)
                .updatedAt(now)
                .build();
        return albumRepository.save(album);
    }

    public Album update(String id, @Valid AlbumRequest request) {
        Album existing = albumRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Album not found"));

        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setVisibility(request.getVisibility());
        existing.setAccessCode(request.getVisibility() == Album.Visibility.PRIVATE ? request.getAccessCode() : null);
        existing.setTags(request.getTags() == null ? List.of() : request.getTags());
        existing.setCoverPhotoId(request.getCoverPhotoId());
        existing.setUpdatedAt(Instant.now());
        return albumRepository.save(existing);
    }

    public void delete(String id) {
        albumRepository.deleteById(id);
    }
}
