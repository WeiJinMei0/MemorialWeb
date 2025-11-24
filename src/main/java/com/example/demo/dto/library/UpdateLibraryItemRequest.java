package com.example.demo.dto.library;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateLibraryItemRequest(
        @Min(value = 0, message = "slotIndex 不能小于0")
        @Max(value = 7, message = "slotIndex 最大为7")
        int slotIndex
) {
}
