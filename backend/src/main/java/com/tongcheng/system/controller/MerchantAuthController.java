package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.dto.AuthDtos;
import com.tongcheng.system.security.RequireRole;
import com.tongcheng.system.service.AuthService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/merchant/auth")
public class MerchantAuthController {

    private final AuthService authService;

    public MerchantAuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@Validated @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.success("登录成功", authService.login(request, "merchant"));
    }

    @GetMapping("/info")
    @RequireRole({"merchant"})
    public ApiResponse<Map<String, Object>> info() {
        return ApiResponse.success(authService.getMerchantCurrentInfo());
    }
}
