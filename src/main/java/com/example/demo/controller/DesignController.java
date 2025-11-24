package com.example.demo.controller;

import com.example.demo.common.ApiResponse;
import com.example.demo.common.PagedResult;
import com.example.demo.dto.design.CreateDesignRequest;
import com.example.demo.dto.design.DesignListItem;
import com.example.demo.dto.design.DesignResponse;
import com.example.demo.persistence.entity.UserEntity;
import com.example.demo.service.AuthService;
import com.example.demo.service.DesignService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/designs")
public class DesignController {

    private final AuthService authService;
    private final DesignService designService;

    public DesignController(AuthService authService, DesignService designService) {
        this.authService = authService;
        this.designService = designService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ApiResponse<DesignResponse>> createDesign(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @Valid @RequestBody CreateDesignRequest request) {
        return Mono.fromSupplier(() -> {
            Long userId = getUserId(authorization);
            return ApiResponse.created("Created", designService.create(userId, request));
        });
    }

    @GetMapping
    public Mono<ApiResponse<PagedResult<DesignListItem>>> listDesigns(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            @RequestParam(value = "keyword", required = false) String keyword) {
        return Mono.fromSupplier(() -> {
            Long userId = getUserId(authorization);
            PagedResult<DesignListItem> result = designService.list(userId, page, pageSize, keyword);
            return ApiResponse.success(result);
        });
    }

    @GetMapping("/{id}")
    public Mono<ApiResponse<DesignResponse>> getDesign(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id) {
        return Mono.fromSupplier(() -> ApiResponse.success(designService.getDetail(getUserId(authorization), id)));
    }

    @PutMapping("/{id}")
    public Mono<ApiResponse<DesignResponse>> updateDesign(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id,
            @Valid @RequestBody CreateDesignRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.success(designService.update(getUserId(authorization), id, request)));
    }

    @DeleteMapping("/{id}")
    public Mono<ApiResponse<Void>> deleteDesign(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id) {
        return Mono.fromSupplier(() -> {
            designService.delete(getUserId(authorization), id);
            return ApiResponse.message("Deleted");
        });
    }

    private Long getUserId(String authorization) {
        UserEntity user = authService.requireUserFromHeader(authorization);
        return user.getId();
    }
}
