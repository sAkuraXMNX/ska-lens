package com.ska.skaLensBackend.controller;

import com.ska.skaLensBackend.dto.AlbumRequest;
import com.ska.skaLensBackend.model.Album;
import com.ska.skaLensBackend.service.AlbumService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/albums")
public class AlbumController {

    private final AlbumService albumService;

    public AlbumController(AlbumService albumService) {
        this.albumService = albumService;
    }

    @GetMapping
    public List<Album> list(@RequestParam(defaultValue = "false") boolean includePrivate, Authentication authentication) {
        boolean isAdmin = isAdmin(authentication);
        return includePrivate && isAdmin ? albumService.listAll() : albumService.listPublic();
    }

    @GetMapping("/{id}")
    public Album getById(
            @PathVariable String id,
            @RequestParam(required = false) String accessCode,
            Authentication authentication
    ) {
        return albumService.getById(id, isAdmin(authentication), accessCode);
    }

    @PostMapping
    public Album create(@Valid @RequestBody AlbumRequest request) {
        return albumService.create(request);
    }

    @PutMapping("/{id}")
    public Album update(@PathVariable String id, @Valid @RequestBody AlbumRequest request) {
        return albumService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        albumService.delete(id);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> "ROLE_ADMIN".equals(grantedAuthority.getAuthority()));
    }
}
