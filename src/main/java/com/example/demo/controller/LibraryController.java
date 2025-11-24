package com.example.demo.controller;

import com.example.demo.common.ApiResponse;
import com.example.demo.dto.library.CreateLibraryItemRequest;
import com.example.demo.dto.library.LibraryItemResponse;
import com.example.demo.dto.library.UpdateLibraryItemRequest;
import com.example.demo.persistence.entity.UserEntity;
import com.example.demo.service.AuthService;
import com.example.demo.service.LibraryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/library/items")
public class LibraryController {

    private final AuthService authService;
    private final LibraryService libraryService;

    public LibraryController(AuthService authService, LibraryService libraryService) {
        this.authService = authService;
        this.libraryService = libraryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ApiResponse<LibraryItemResponse>> createItem(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @Valid @RequestBody CreateLibraryItemRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.created("Saved",
                libraryService.create(getUserId(authorization), request)));
    }

    @GetMapping
    public Mono<ApiResponse<List<LibraryItemResponse>>> listItems(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return Mono.fromSupplier(() -> ApiResponse.success(libraryService.list(getUserId(authorization))));
    }

    @PutMapping("/{id}")
    public Mono<ApiResponse<LibraryItemResponse>> updateItem(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id,
            @Valid @RequestBody UpdateLibraryItemRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.success(
                libraryService.update(getUserId(authorization), id, request)));
    }

    @DeleteMapping("/{id}")
    public Mono<ApiResponse<Void>> deleteItem(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id) {
        return Mono.fromSupplier(() -> {
            libraryService.delete(getUserId(authorization), id);
            return ApiResponse.message("Deleted");
        });
    }

    private Long getUserId(String authorization) {
        UserEntity user = authService.requireUserFromHeader(authorization);
        return user.getId();
    }
}
