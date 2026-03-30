package com.ska.skaLensBackend.service;

import com.ska.skaLensBackend.dto.BatchTagUpdateRequest;
import com.ska.skaLensBackend.dto.CommentRequest;
import com.ska.skaLensBackend.dto.LikeRequest;
import com.ska.skaLensBackend.dto.PhotoFeedResponse;
import com.ska.skaLensBackend.dto.PhotoUpdateRequest;
import com.ska.skaLensBackend.model.Album;
import com.ska.skaLensBackend.model.Comment;
import com.ska.skaLensBackend.model.Photo;
import com.ska.skaLensBackend.repository.AlbumRepository;
import com.ska.skaLensBackend.repository.PhotoRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.domain.Sort;
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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final AlbumRepository albumRepository;
    private final CommentService commentService;
    private final ExifExtractorService exifExtractorService;
    private final MongoTemplate mongoTemplate;
    private final Path uploadDir;

    public PhotoService(
            PhotoRepository photoRepository,
            AlbumRepository albumRepository,
            CommentService commentService,
            ExifExtractorService exifExtractorService,
            MongoTemplate mongoTemplate,
            @Value("${app.upload-dir:uploads}") String uploadDir
    ) {
        this.photoRepository = photoRepository;
        this.albumRepository = albumRepository;
        this.commentService = commentService;
        this.exifExtractorService = exifExtractorService;
        this.mongoTemplate = mongoTemplate;
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

    public PhotoFeedResponse listFeed(String cursor, int limit, String tag, String albumId, boolean includePrivate) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        CursorPosition cursorPosition = parseCursor(cursor);
        List<Photo> items = new ArrayList<>();
        CursorPosition lastScanned = cursorPosition;

        while (items.size() < safeLimit) {
            List<Photo> scanned = scanFeedBatch(lastScanned, safeLimit, tag, albumId);
            if (scanned.isEmpty()) {
                break;
            }
            lastScanned = toCursorPosition(scanned.get(scanned.size() - 1));
            for (Photo photo : scanned) {
                if (includePrivate || isPublicPhoto(photo)) {
                    items.add(photo);
                    if (items.size() == safeLimit) {
                        break;
                    }
                }
            }
            if (scanned.size() < safeLimit) {
                break;
            }
        }

        CursorPosition lastVisible = items.isEmpty() ? null : toCursorPosition(items.get(items.size() - 1));
        String nextCursor = items.isEmpty() ? null : buildCursor(items.get(items.size() - 1));
        boolean hasMore = items.size() == safeLimit && hasMoreVisiblePhotos(lastVisible, tag, albumId, includePrivate, safeLimit);
        return PhotoFeedResponse.builder()
                .items(items)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
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
        ensurePhotoExists(id);
        commentService.create(id, request);
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(id)),
                new Update().inc("commentCount", 1).set("updatedAt", Instant.now()),
                Photo.class
        );
        return getById(id, true);
    }

    public List<Comment> listComments(String id) {
        ensurePhotoExists(id);
        return commentService.listByPhotoId(id);
    }

    public Photo like(String id, @Valid LikeRequest request) {
        ensurePhotoExists(id);
        Query query = Query.query(
                Criteria.where("_id").is(id)
                        .and("likedBy").ne(request.getUserId())
        );
        Update update = new Update()
                .addToSet("likedBy", request.getUserId())
                .inc("likeCount", 1)
                .set("updatedAt", Instant.now());
        mongoTemplate.updateFirst(query, update, Photo.class);
        return getById(id, true);
    }

    public Photo unlike(String id, @Valid LikeRequest request) {
        ensurePhotoExists(id);
        Query query = Query.query(
                Criteria.where("_id").is(id)
                        .and("likedBy").is(request.getUserId())
        );
        Update update = new Update()
                .pull("likedBy", request.getUserId())
                .inc("likeCount", -1)
                .set("updatedAt", Instant.now());
        mongoTemplate.updateFirst(query, update, Photo.class);
        return getById(id, true);
    }

    public List<Comment> listTopComments(String id) {
        ensurePhotoExists(id);
        return commentService.listTop2ByPhotoId(id);
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

    private List<Photo> scanFeedBatch(CursorPosition cursor, int limit, String tag, String albumId) {
        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("published").is(true));

        if (StringUtils.hasText(tag)) {
            andCriteria.add(Criteria.where("tags").in(tag));
        }
        if (StringUtils.hasText(albumId)) {
            andCriteria.add(Criteria.where("albumId").is(albumId));
        }
        if (cursor != null) {
            andCriteria.add(new Criteria().orOperator(
                    Criteria.where("createdAt").lt(cursor.createdAt()),
                    new Criteria().andOperator(
                            Criteria.where("createdAt").is(cursor.createdAt()),
                            Criteria.where("_id").lt(cursor.photoId())
                    )
            ));
        }

        Query query = new Query(new Criteria().andOperator(andCriteria.toArray(new Criteria[0])))
                .with(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("_id")))
                .limit(limit);
        return mongoTemplate.find(query, Photo.class);
    }

    private boolean hasMoreVisiblePhotos(
            CursorPosition cursor,
            String tag,
            String albumId,
            boolean includePrivate,
            int limit
    ) {
        CursorPosition scanningCursor = cursor;
        for (int i = 0; i < 5; i++) {
            List<Photo> scanned = scanFeedBatch(scanningCursor, limit, tag, albumId);
            if (scanned.isEmpty()) {
                return false;
            }
            if (includePrivate || scanned.stream().anyMatch(this::isPublicPhoto)) {
                return true;
            }
            scanningCursor = toCursorPosition(scanned.get(scanned.size() - 1));
            if (scanned.size() < limit) {
                return false;
            }
        }
        return true;
    }

    private CursorPosition parseCursor(String cursor) {
        if (!StringUtils.hasText(cursor)) {
            return null;
        }
        String[] parts = cursor.split("_", 2);
        if (parts.length != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
        try {
            return new CursorPosition(Instant.ofEpochMilli(Long.parseLong(parts[0])), parts[1]);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
    }

    private String buildCursor(Photo photo) {
        Instant createdAt = photo.getCreatedAt() == null ? Instant.EPOCH : photo.getCreatedAt();
        return createdAt.toEpochMilli() + "_" + photo.getId();
    }

    private CursorPosition toCursorPosition(Photo photo) {
        return new CursorPosition(photo.getCreatedAt() == null ? Instant.EPOCH : photo.getCreatedAt(), photo.getId());
    }

    private void ensurePhotoExists(String id) {
        if (!photoRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
    }

    private record CursorPosition(Instant createdAt, String photoId) {
    }
}
