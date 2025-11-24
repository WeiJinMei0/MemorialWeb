package com.example.demo.service;

import com.example.demo.dto.auth.AuthResponse;
import com.example.demo.dto.auth.LoginRequest;
import com.example.demo.dto.auth.RegisterRequest;
import com.example.demo.dto.auth.UserResponse;
import com.example.demo.exception.ApiException;
import com.example.demo.persistence.entity.UserEntity;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public UserResponse register(RegisterRequest request) {
        userRepository.findByUsernameIgnoreCase(request.username()).ifPresent(u -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Username already exists");
        });
        userRepository.findByEmailIgnoreCase(request.email()).ifPresent(u -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered");
        });

        UserEntity user = new UserEntity();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setType(request.type());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
        return toResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository
                .findByUsernameIgnoreCaseOrEmailIgnoreCase(request.account(), request.account())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(token, jwtService.getExpirationSeconds(), toResponse(user));
    }

    public UserEntity requireUserFromHeader(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }
        String token = authorizationHeader.substring("Bearer ".length()).trim();
        Long userId = jwtService.parseUserId(token);
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    public UserResponse getCurrentUser(String authorizationHeader) {
        return toResponse(requireUserFromHeader(authorizationHeader));
    }

    private UserResponse toResponse(UserEntity user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getType(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
