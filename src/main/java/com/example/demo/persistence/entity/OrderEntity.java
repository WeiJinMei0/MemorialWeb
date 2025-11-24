package com.example.demo.persistence.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class OrderEntity extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "design_id")
    private Long designId;

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private JsonNode designSnapshot;

    @Lob
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String thumbnail;

    @Column(length = 64, nullable = false)
    private String status;

    @Column(name = "order_form_data", columnDefinition = "LONGTEXT", nullable = false)
    private JsonNode orderFormData;

    @Column(name = "order_number", nullable = false, unique = true, length = 64)
    private String orderNumber;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getDesignId() {
        return designId;
    }

    public void setDesignId(Long designId) {
        this.designId = designId;
    }

    public JsonNode getDesignSnapshot() {
        return designSnapshot;
    }

    public void setDesignSnapshot(JsonNode designSnapshot) {
        this.designSnapshot = designSnapshot;
    }

    public String getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(String thumbnail) {
        this.thumbnail = thumbnail;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public JsonNode getOrderFormData() {
        return orderFormData;
    }

    public void setOrderFormData(JsonNode orderFormData) {
        this.orderFormData = orderFormData;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }
}
