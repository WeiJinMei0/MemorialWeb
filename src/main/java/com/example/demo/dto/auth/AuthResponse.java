package com.example.demo.dto.auth;

public record AuthResponse(
        String token,
        long expiresIn,
        UserResponse user
) {
}
