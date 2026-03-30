package com.ska.skaLensBackend.service;

import com.ska.skaLensBackend.dto.BatchTagUpdateRequest;
import com.ska.skaLensBackend.dto.CommentRequest;
import com.ska.skaLensBackend.dto.PhotoUpdateRequest;
import com.ska.skaLensBackend.model.Album;
import com.ska.skaLensBackend.model.Photo;
import com.ska.skaLensBackend.repository.AlbumRepository;
import com.ska.skaLensBackend.repository.PhotoRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final AlbumRepository albumRepository;
    private final ExifExtractorService exifExtractorService;
    private final Path uploadDir;

    public PhotoService(
            PhotoRepository photoRepository,
            AlbumRepository albumRepository,
            ExifExtractorService exifExtractorService,
            @Value("${app.upload-dir:uploads}") String uploadDir
    ) {
        this.photoRepository = photoRepository;
        this.albumRepository = albumRepository;
        this.exifExtractorService = exifExtractorService;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public List<Photo> listPhotos(String tag, String albumId, boolean includePrivate) {
        List<Photo> photos = albumId == null
                ? photoRepository.findAllByOrderByCreatedAtDesc()
                : photoRepository.findByAlbumIdOrderByCreatedAtDesc(albumId);

        return photos.stream()
                .filter(Photo::isPublished)
                .filter(photo -> tag == null || photo.getTags() != null && photo.getTags().contains(tag))
                .filter(photo -> includePrivate || isPublicPhoto(photo))
                .toList();
    }

    public List<Photo> listAllForAdmin() {
        return photoRepository.findAll().stream()
                .sorted(Comparator.comparing(Photo::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public Photo getById(String id, boolean includePrivate) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));

        if (!photo.isPublished()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }

        if (!includePrivate && !isPublicPhoto(photo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
        return photo;
    }

    public List<Photo> upload(
            List<MultipartFile> files,
            String albumId,
            String title,
            String description,
            String tags
    ) {
        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No files uploaded");
        }

        if (StringUtils.hasText(albumId) && !albumRepository.existsById(albumId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Album does not exist");
        }

        List<String> parsedTags = parseTags(tags);
        List<Photo> created = new ArrayList<>();

        try {
            Files.createDirectories(uploadDir);

            for (MultipartFile file : files) {
                validateImage(file);

                String extension = getExtension(file.getOriginalFilename());
                String safeName = UUID.randomUUID() + (extension.isBlank() ? "" : "." + extension);
                Path target = uploadDir.resolve(safeName).normalize();
                if (!target.startsWith(uploadDir)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
                }

                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

                Instant now = Instant.now();
                Photo photo = Photo.builder()
                        .title(StringUtils.hasText(title) ? title : stripExtension(file.getOriginalFilename()))
                        .description(description)
                        .imageUrl("/uploads/" + safeName)
                        .thumbnailUrl("/uploads/" + safeName)
                        .albumId(StringUtils.hasText(albumId) ? albumId : null)
                        .tags(parsedTags)
                        .exif(exifExtractorService.extract(target.toFile()))
                        .published(true)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
                created.add(photo);
            }

            return photoRepository.saveAll(created);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image", e);
        }
    }

    public Photo update(String id, @Valid PhotoUpdateRequest request) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));

        if (request.getAlbumId() != null && !request.getAlbumId().isBlank() && !albumRepository.existsById(request.getAlbumId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Album does not exist");
        }

        if (request.getTitle() != null) {
            photo.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            photo.setDescription(request.getDescription());
        }
        if (request.getAlbumId() != null) {
            photo.setAlbumId(request.getAlbumId().isBlank() ? null : request.getAlbumId());
        }
        if (request.getTags() != null) {
            photo.setTags(request.getTags());
        }
        if (request.getPublished() != null) {
            photo.setPublished(request.getPublished());
        }

        photo.setUpdatedAt(Instant.now());
        return photoRepository.save(photo);
    }

    public void delete(String id) {
        photoRepository.deleteById(id);
    }

    public void batchDelete(List<String> ids) {
        photoRepository.deleteAllById(ids);
    }

    public List<Photo> batchUpdateTags(@Valid BatchTagUpdateRequest request) {
        Set<String> idSet = request.getIds().stream().filter(Objects::nonNull).collect(Collectors.toSet());
        List<Photo> photos = photoRepository.findAllById(idSet);
        List<String> tags = request.getTags() == null ? List.of() : request.getTags();

        photos.forEach(photo -> {
            photo.setTags(tags);
            photo.setUpdatedAt(Instant.now());
        });
        return photoRepository.saveAll(photos);
    }

    public Photo addComment(String id, @Valid CommentRequest request) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));

        List<Photo.Comment> comments = new ArrayList<>(Optional.ofNullable(photo.getComments()).orElse(List.of()));
        comments.add(Photo.Comment.builder()
                .authorName(request.getAuthorName())
                .content(request.getContent())
                .createdAt(Instant.now())
                .build());

        photo.setComments(comments);
        photo.setUpdatedAt(Instant.now());
        return photoRepository.save(photo);
    }

    private boolean isPublicPhoto(Photo photo) {
        if (!StringUtils.hasText(photo.getAlbumId())) {
            return true;
        }
        return albumRepository.findById(photo.getAlbumId())
                .map(album -> album.getVisibility() == Album.Visibility.PUBLIC)
                .orElse(true);
    }

    private void validateImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file cannot be uploaded");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed");
        }
    }

    private String getExtension(String filename) {
        if (!StringUtils.hasText(filename) || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    }

    private String stripExtension(String filename) {
        if (!StringUtils.hasText(filename)) {
            return "untitled";
        }
        int i = filename.lastIndexOf('.');
        return i > 0 ? filename.substring(0, i) : filename;
    }

    private List<String> parseTags(String tags) {
        if (!StringUtils.hasText(tags)) {
            return List.of();
        }
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .distinct()
                .toList();
    }
}
