package com.example.demo.dto.order;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateOrderRequest(
        String designId,
        @NotNull(message = "designSnapshot 不能为空")
        JsonNode designSnapshot,
        @NotBlank(message = "缩略图不能为空")
        String thumbnail,
        String status,
        @NotNull(message = "orderFormData 不能为空")
        JsonNode orderFormData
) {
}
