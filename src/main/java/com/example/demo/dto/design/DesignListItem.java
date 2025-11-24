package com.example.demo.dto.design;

import java.time.Instant;

public record DesignListItem(
        String id,
        String name,
        String thumbnail,
        Instant updatedAt
) {
}
