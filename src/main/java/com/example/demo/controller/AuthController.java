package com.example.demo.controller;

import com.example.demo.common.ApiResponse;
import com.example.demo.dto.auth.AuthResponse;
import com.example.demo.dto.auth.LoginRequest;
import com.example.demo.dto.auth.RegisterRequest;
import com.example.demo.dto.auth.UserResponse;
import com.example.demo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.created("Register success", authService.register(request)));
    }

    @PostMapping("/login")
    public Mono<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.success("Login success", authService.login(request)));
    }

    @GetMapping("/me")
    public Mono<ApiResponse<UserResponse>> current(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return Mono.fromSupplier(() -> ApiResponse.success(authService.getCurrentUser(authorization)));
    }
}
