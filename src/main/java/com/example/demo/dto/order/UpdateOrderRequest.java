package com.example.demo.dto.order;

import com.fasterxml.jackson.databind.JsonNode;

public record UpdateOrderRequest(
        String status,
        JsonNode orderFormData
) {
}
