package com.example.demo.dto.design;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDesignRequest(
        @NotBlank(message = "设计名称不能为空")
        String name,

        @NotBlank(message = "缩略图不能为空")
        String thumbnail,

        @NotNull(message = "设计状态不能为空")
        JsonNode designState
) {
}
