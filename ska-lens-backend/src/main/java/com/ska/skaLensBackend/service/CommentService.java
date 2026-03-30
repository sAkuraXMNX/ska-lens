package com.ska.skaLensBackend.service;

import com.ska.skaLensBackend.dto.CommentRequest;
import com.ska.skaLensBackend.model.Comment;
import com.ska.skaLensBackend.repository.CommentRepository;
import jakarta.validation.Valid;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public Comment create(String photoId, @Valid CommentRequest request) {
        String userId = StringUtils.hasText(request.getUserId()) ? request.getUserId() : request.getAuthorName();
        Comment comment = Comment.builder()
                .photoId(photoId)
                .userId(userId)
                .content(request.getContent())
                .createdAt(Instant.now())
                .build();
        return commentRepository.save(comment);
    }

    public List<Comment> listByPhotoId(String photoId) {
        return commentRepository.findByPhotoIdOrderByCreatedAtDesc(photoId);
    }

    public List<Comment> listTop2ByPhotoId(String photoId) {
        return commentRepository.findTop2ByPhotoIdOrderByCreatedAtDesc(photoId);
    }
}
