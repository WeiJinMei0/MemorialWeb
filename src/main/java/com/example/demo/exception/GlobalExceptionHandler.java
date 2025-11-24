package com.example.demo.exception;

import com.example.demo.common.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        HttpStatus status = ex.getStatus();
        return ResponseEntity.status(status).body(ApiResponse.error(status.value(), ex.getMessage()));
    }

    @ExceptionHandler({WebExchangeBindException.class, ConstraintViolationException.class})
    public ResponseEntity<ApiResponse<Void>> handleValidationExceptions(Exception ex) {
        String message = ex.getMessage();
        if (ex instanceof WebExchangeBindException bindException && bindException.getFieldError() != null) {
            message = bindException.getFieldError().getDefaultMessage();
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(HttpStatus.BAD_REQUEST.value(), message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOtherExceptions(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal server error"));
    }
}
