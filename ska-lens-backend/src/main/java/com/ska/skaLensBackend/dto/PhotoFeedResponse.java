package com.ska.skaLensBackend.dto;

import com.ska.skaLensBackend.model.Photo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoFeedResponse {
    private List<Photo> items;
    private String nextCursor;
    private boolean hasMore;
}
