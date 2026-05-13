package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.dto.AuthDtos;
import com.tongcheng.system.security.RequireRole;
import com.tongcheng.system.service.AuthService;
import com.tongcheng.system.service.StaffPortalService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/staff/auth")
public class StaffAuthController {

    private final AuthService authService;
    private final StaffPortalService staffPortalService;

    public StaffAuthController(AuthService authService, StaffPortalService staffPortalService) {
        this.authService = authService;
        this.staffPortalService = staffPortalService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@Validated @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.success("登录成功", authService.login(request, "staff"));
    }

    @GetMapping("/info")
    @RequireRole({"staff"})
    public ApiResponse<Map<String, Object>> info() {
        return ApiResponse.success(staffPortalService.getAuthInfo(authService.requireCurrentUser().getUserId()));
    }
}
