package com.example.demo.dto.design;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record DesignResponse(
        String id,
        String name,
        String thumbnail,
        JsonNode designState,
        Instant createdAt,
        Instant updatedAt
) {
}
