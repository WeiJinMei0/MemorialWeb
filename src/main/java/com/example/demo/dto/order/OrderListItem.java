package com.example.demo.dto.order;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record OrderListItem(
        String id,
        String orderNumber,
        String status,
        String thumbnail,
        JsonNode orderFormData,
        Instant createdAt
) {
}
