package com.example.demo.dto.order;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record OrderResponse(
        String id,
        String orderNumber,
        String status,
        String designId,
        JsonNode designSnapshot,
        String thumbnail,
        JsonNode orderFormData,
        Instant createdAt,
        Instant updatedAt
) {
}
