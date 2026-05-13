package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.StaffDtos;
import com.tongcheng.system.security.RequireRole;
import com.tongcheng.system.service.AuthService;
import com.tongcheng.system.service.StaffPortalService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/staff")
@RequireRole({"staff"})
public class StaffPortalController {

    private final StaffPortalService staffPortalService;
    private final AuthService authService;

    public StaffPortalController(StaffPortalService staffPortalService, AuthService authService) {
        this.staffPortalService = staffPortalService;
        this.authService = authService;
    }

    @GetMapping("/dashboard/summary")
    public ApiResponse<Map<String, Object>> dashboardSummary() {
        return ApiResponse.success(staffPortalService.getDashboardSummary(authService.requireCurrentUser().getUserId()));
    }

    @GetMapping("/order/list")
    public ApiResponse<PageResult<Map<String, Object>>> orderList(StaffDtos.OrderQuery query) {
        return ApiResponse.success(staffPortalService.pageOrders(authService.requireCurrentUser().getUserId(), query));
    }

    @GetMapping("/order/{id}")
    public ApiResponse<Map<String, Object>> orderDetail(@PathVariable Long id) {
        return ApiResponse.success(staffPortalService.getOrderDetail(authService.requireCurrentUser().getUserId(), id));
    }

    @PostMapping("/order/start")
    public ApiResponse<Void> startOrder(@Validated @RequestBody StaffDtos.OrderActionRequest request) {
        staffPortalService.startOrder(authService.requireCurrentUser().getUserId(), request.getOrderId());
        return ApiResponse.success("服务已开始", null);
    }

    @PostMapping("/order/complete")
    public ApiResponse<Void> completeOrder(@Validated @RequestBody StaffDtos.OrderActionRequest request) {
        staffPortalService.completeOrder(authService.requireCurrentUser().getUserId(), request.getOrderId());
        return ApiResponse.success("服务已完成", null);
    }

    @GetMapping("/profile/detail")
    public ApiResponse<Map<String, Object>> profileDetail() {
        return ApiResponse.success(staffPortalService.getProfileDetail(authService.requireCurrentUser().getUserId()));
    }

    @GetMapping("/order/message/list")
    public ApiResponse<List<Map<String, Object>>> messageList(Long orderId) {
        return ApiResponse.success(staffPortalService.listOrderMessages(authService.requireCurrentUser().getUserId(), orderId));
    }

    @PostMapping("/order/message/send")
    public ApiResponse<Void> sendMessage(@Validated @RequestBody StaffDtos.MessageSendRequest request) {
        staffPortalService.sendOrderMessage(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("发送成功", null);
    }
}
