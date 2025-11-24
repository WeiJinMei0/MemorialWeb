package com.example.demo.dto.library;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateLibraryItemRequest(
        @NotBlank(message = "类型不能为空")
        @Pattern(regexp = "text|art", message = "类型只能是 text 或 art")
        String type,
        @Min(value = 0, message = "slotIndex 不能小于0")
        @Max(value = 7, message = "slotIndex 最大为7")
        int slotIndex,
        @NotBlank(message = "缩略图不能为空")
        String thumbnail,
        @NotNull(message = "data 不能为空")
        JsonNode data
) {
}
