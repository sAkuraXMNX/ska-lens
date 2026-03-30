package com.ska.skaLensBackend.controller;

import com.ska.skaLensBackend.dto.BatchDeleteRequest;
import com.ska.skaLensBackend.dto.BatchTagUpdateRequest;
import com.ska.skaLensBackend.dto.CommentRequest;
import com.ska.skaLensBackend.dto.PhotoUpdateRequest;
import com.ska.skaLensBackend.model.Photo;
import com.ska.skaLensBackend.service.PhotoService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping
    public List<Photo> list(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String albumId,
            @RequestParam(defaultValue = "false") boolean includePrivate,
            Authentication authentication
    ) {
        boolean canIncludePrivate = includePrivate && isAdmin(authentication);
        return photoService.listPhotos(tag, albumId, canIncludePrivate);
    }

    @GetMapping("/admin")
    public List<Photo> listAdmin() {
        return photoService.listAllForAdmin();
    }

    @GetMapping("/{id}")
    public Photo getById(@PathVariable String id, @RequestParam(defaultValue = "false") boolean includePrivate, Authentication authentication) {
        return photoService.getById(id, includePrivate && isAdmin(authentication));
    }

    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    public List<Photo> upload(
            @RequestPart("files") List<MultipartFile> files,
            @RequestParam(required = false) String albumId,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String tags
    ) {
        return photoService.upload(files, albumId, title, description, tags);
    }

    @PutMapping("/{id}")
    public Photo update(@PathVariable String id, @Valid @RequestBody PhotoUpdateRequest request) {
        return photoService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        photoService.delete(id);
    }

    @DeleteMapping("/batch")
    public void batchDelete(@Valid @RequestBody BatchDeleteRequest request) {
        photoService.batchDelete(request.getIds());
    }

    @PutMapping("/batch/tags")
    public List<Photo> batchUpdateTags(@Valid @RequestBody BatchTagUpdateRequest request) {
        return photoService.batchUpdateTags(request);
    }

    @PostMapping("/{id}/comments")
    public Photo addComment(@PathVariable String id, @Valid @RequestBody CommentRequest request) {
        return photoService.addComment(id, request);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> "ROLE_ADMIN".equals(grantedAuthority.getAuthority()));
    }
}
