package com.ska.skaLensBackend.repository;

import com.ska.skaLensBackend.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CommentRepository extends MongoRepository<Comment, String> {
    List<Comment> findTop2ByPhotoIdOrderByCreatedAtDesc(String photoId);

    List<Comment> findByPhotoIdOrderByCreatedAtDesc(String photoId);
}
