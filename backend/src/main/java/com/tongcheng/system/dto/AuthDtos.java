package com.tongcheng.system.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {
    }

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "用户名不能为空")
        @Size(max = 50, message = "用户名长度不能超过50")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
        @NotBlank(message = "确认密码不能为空")
        private String confirmPassword;
        private String nickname;
        private String phone;
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
    }
}
