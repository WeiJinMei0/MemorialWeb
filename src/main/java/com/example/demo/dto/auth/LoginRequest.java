package com.example.demo.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "登录账号不能为空")
        String account,

        @NotBlank(message = "密码不能为空")
        String password
) {
}
