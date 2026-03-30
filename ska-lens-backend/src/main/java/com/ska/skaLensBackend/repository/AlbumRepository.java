package com.ska.skaLensBackend.repository;

import com.ska.skaLensBackend.model.Album;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AlbumRepository extends MongoRepository<Album, String> {
    List<Album> findByVisibility(Album.Visibility visibility);
}
