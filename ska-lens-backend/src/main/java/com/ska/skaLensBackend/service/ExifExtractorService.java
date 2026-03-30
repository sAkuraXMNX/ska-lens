package com.ska.skaLensBackend.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.Tag;
import com.ska.skaLensBackend.model.Photo;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class ExifExtractorService {

    public Photo.ExifInfo extract(File file) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(file);
            Map<String, String> values = new HashMap<>();
            for (var directory : metadata.getDirectories()) {
                for (Tag tag : directory.getTags()) {
                    values.putIfAbsent(tag.getTagName().toLowerCase(Locale.ROOT), tag.getDescription());
                }
            }
            return Photo.ExifInfo.builder()
                    .cameraModel(get(values, "model"))
                    .lensModel(get(values, "lens model", "lens"))
                    .aperture(get(values, "f-number", "aperture value"))
                    .shutterSpeed(get(values, "exposure time", "shutter speed value"))
                    .iso(parseIso(get(values, "iso equivalent", "photographic sensitivity", "iso speed ratings")))
                    .focalLength(get(values, "focal length"))
                    .capturedAt(get(values, "date/time original", "date/time"))
                    .build();
        } catch (Exception ignored) {
            return Photo.ExifInfo.builder().build();
        }
    }

    private String get(Map<String, String> values, String... keys) {
        for (String key : keys) {
            String value = values.get(key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Integer parseIso(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
