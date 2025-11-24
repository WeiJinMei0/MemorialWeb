package com.example.demo.dto.auth;

import java.time.Instant;

public record UserResponse(
        Long id,
        String username,
        String email,
        String phone,
        String type,
        Instant createdAt,
        Instant updatedAt
) {
}
