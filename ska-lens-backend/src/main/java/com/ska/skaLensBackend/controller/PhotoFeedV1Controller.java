package com.ska.skaLensBackend.controller;

import com.ska.skaLensBackend.dto.PhotoFeedResponse;
import com.ska.skaLensBackend.service.PhotoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/photos")
public class PhotoFeedV1Controller {

    private final PhotoService photoService;

    public PhotoFeedV1Controller(PhotoService photoService) {
        this.photoService = photoService;
    }

    @GetMapping("/feed")
    public PhotoFeedResponse feed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String albumId
    ) {
        return photoService.listFeed(cursor, limit, tag, albumId, false);
    }
}
