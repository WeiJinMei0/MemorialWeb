package com.example.demo.service;

import com.example.demo.common.PagedResult;
import com.example.demo.dto.order.CreateOrderRequest;
import com.example.demo.dto.order.OrderListItem;
import com.example.demo.dto.order.OrderResponse;
import com.example.demo.dto.order.UpdateOrderRequest;
import com.example.demo.exception.ApiException;
import com.example.demo.persistence.entity.OrderEntity;
import com.example.demo.repository.OrderRepository;
import com.example.demo.util.IdUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class OrderService {

    private static final DateTimeFormatter ORDER_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper;
    private final AtomicInteger dailySequence = new AtomicInteger(0);

    public OrderService(OrderRepository orderRepository, ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.objectMapper = objectMapper;
    }

    public OrderResponse create(Long userId, CreateOrderRequest request) {
        OrderEntity order = new OrderEntity();
        order.setUserId(userId);
        if (StringUtils.hasText(request.designId())) {
            order.setDesignId(IdUtils.parseDesignId(request.designId()));
        }
        order.setDesignSnapshot(request.designSnapshot());
        order.setThumbnail(request.thumbnail());
        order.setStatus(StringUtils.hasText(request.status()) ? request.status() : "Pending");
        order.setOrderFormData(request.orderFormData());
        order.setOrderNumber(generateUniqueOrderNumber());
        orderRepository.save(order);
        return toResponse(order);
    }

    public PagedResult<OrderListItem> list(Long userId, Integer page, Integer pageSize, String keyword, String status) {
        int safePage = page == null || page < 1 ? 1 : page;
        int safeSize = pageSize == null || pageSize < 1 ? 10 : Math.min(pageSize, 100);
        List<OrderEntity> all = orderRepository.findByUserId(userId);
        if (StringUtils.hasText(keyword)) {
            String lower = keyword.toLowerCase();
            all = all.stream()
                    .filter(o -> o.getOrderNumber() != null && o.getOrderNumber().toLowerCase().contains(lower))
                    .collect(Collectors.toList());
        }
        if (StringUtils.hasText(status)) {
            String expected = status.trim();
            all = all.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().equalsIgnoreCase(expected))
                    .collect(Collectors.toList());
        }
        all.sort(Comparator.comparing(OrderEntity::getCreatedAt).reversed());
        int from = Math.min((safePage - 1) * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        List<OrderListItem> items = all.subList(from, to).stream()
                .map(this::toListItem)
                .collect(Collectors.toList());
        return new PagedResult<>(items, all.size(), safePage, safeSize);
    }

    public OrderResponse getDetail(Long userId, String id) {
        OrderEntity order = orderRepository.findByIdAndUserId(IdUtils.parseOrderId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        return toResponse(order);
    }

    public OrderResponse update(Long userId, String id, UpdateOrderRequest request) {
        OrderEntity order = orderRepository.findByIdAndUserId(IdUtils.parseOrderId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if (StringUtils.hasText(request.status())) {
            order.setStatus(request.status());
        }
        if (request.orderFormData() != null) {
            order.setOrderFormData(request.orderFormData());
        }
        orderRepository.save(order);
        return toResponse(order);
    }

    public void delete(Long userId, String id) {
        OrderEntity order = orderRepository.findByIdAndUserId(IdUtils.parseOrderId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        orderRepository.delete(order);
    }

    private String generateUniqueOrderNumber() {
        String number;
        int attempt = 0;
        do {
            attempt++;
            number = String.format("ORD-%s-%04d", LocalDate.now().format(ORDER_DATE_FORMAT),
                    dailySequence.incrementAndGet());
        } while (orderRepository.existsByOrderNumber(number) && attempt < 5);
        if (orderRepository.existsByOrderNumber(number)) {
            number = number + "-" + System.currentTimeMillis();
        }
        return number;
    }

    private OrderResponse toResponse(OrderEntity order) {
        return new OrderResponse(
                IdUtils.formatOrderId(order.getId()),
                order.getOrderNumber(),
                order.getStatus(),
                order.getDesignId() == null ? null : IdUtils.formatDesignId(order.getDesignId()),
                order.getDesignSnapshot(),
                order.getThumbnail(),
                order.getOrderFormData(),
                order.getCreatedAt(),
                order.getUpdatedAt());
    }

    private OrderListItem toListItem(OrderEntity order) {
        return new OrderListItem(
                IdUtils.formatOrderId(order.getId()),
                order.getOrderNumber(),
                order.getStatus(),
                order.getThumbnail(),
                buildSummary(order.getOrderFormData()),
                order.getCreatedAt());
    }

    private JsonNode buildSummary(JsonNode orderFormData) {
        ObjectNode summary = objectMapper.createObjectNode();
        if (orderFormData == null) {
            return summary;
        }
        copyIfExists(orderFormData, summary, "contractNo");
        copyIfExists(orderFormData, summary, "cemetery");
        copyIfExists(orderFormData, summary, "familyName");
        return summary;
    }

    private void copyIfExists(JsonNode source, ObjectNode target, String field) {
        if (source.has(field)) {
            target.set(field, source.get(field));
        }
    }
}
