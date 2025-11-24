package com.example.demo.dto.library;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record LibraryItemResponse(
        String id,
        String type,
        int slotIndex,
        String thumbnail,
        JsonNode data,
        Instant createdAt,
        Instant updatedAt
) {
}
