package com.example.demo.controller;

import com.example.demo.common.ApiResponse;
import com.example.demo.common.PagedResult;
import com.example.demo.dto.order.CreateOrderRequest;
import com.example.demo.dto.order.OrderListItem;
import com.example.demo.dto.order.OrderResponse;
import com.example.demo.dto.order.UpdateOrderRequest;
import com.example.demo.persistence.entity.UserEntity;
import com.example.demo.service.AuthService;
import com.example.demo.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final AuthService authService;
    private final OrderService orderService;

    public OrderController(AuthService authService, OrderService orderService) {
        this.authService = authService;
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ApiResponse<OrderResponse>> createOrder(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @Valid @RequestBody CreateOrderRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.created("Order created",
                orderService.create(getUserId(authorization), request)));
    }

    @GetMapping
    public Mono<ApiResponse<PagedResult<OrderListItem>>> listOrders(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) String status) {
        return Mono.fromSupplier(() -> ApiResponse.success(
                orderService.list(getUserId(authorization), page, pageSize, keyword, status)));
    }

    @GetMapping("/{id}")
    public Mono<ApiResponse<OrderResponse>> getOrder(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id) {
        return Mono.fromSupplier(() -> ApiResponse.success(orderService.getDetail(getUserId(authorization), id)));
    }

    @PatchMapping("/{id}")
    public Mono<ApiResponse<OrderResponse>> updateOrder(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id,
            @Valid @RequestBody UpdateOrderRequest request) {
        return Mono.fromSupplier(() -> ApiResponse.success(orderService.update(getUserId(authorization), id, request)));
    }

    @DeleteMapping("/{id}")
    public Mono<ApiResponse<Void>> deleteOrder(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String id) {
        return Mono.fromSupplier(() -> {
            orderService.delete(getUserId(authorization), id);
            return ApiResponse.message("Deleted");
        });
    }

    private Long getUserId(String authorization) {
        UserEntity user = authService.requireUserFromHeader(authorization);
        return user.getId();
    }
}
