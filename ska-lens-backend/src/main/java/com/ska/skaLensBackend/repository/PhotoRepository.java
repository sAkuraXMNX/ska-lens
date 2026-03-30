package com.ska.skaLensBackend.repository;

import com.ska.skaLensBackend.model.Photo;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PhotoRepository extends MongoRepository<Photo, String> {
    List<Photo> findAllByOrderByCreatedAtDesc();

    List<Photo> findByAlbumIdOrderByCreatedAtDesc(String albumId);
}
