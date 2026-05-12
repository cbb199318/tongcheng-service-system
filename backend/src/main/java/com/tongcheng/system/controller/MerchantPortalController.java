package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.MerchantDtos;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.security.RequireRole;
import com.tongcheng.system.service.AuthService;
import com.tongcheng.system.service.MerchantPortalService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/merchant")
@RequireRole({"merchant"})
public class MerchantPortalController {

    private final MerchantPortalService merchantPortalService;
    private final AuthService authService;

    public MerchantPortalController(MerchantPortalService merchantPortalService, AuthService authService) {
        this.merchantPortalService = merchantPortalService;
        this.authService = authService;
    }

    @GetMapping("/info/detail")
    public ApiResponse<Merchant> detail() {
        return ApiResponse.success(merchantPortalService.getMerchantDetail(authService.requireCurrentUser().getUserId()));
    }

    @PutMapping("/info/update")
    public ApiResponse<Void> update(@Validated @RequestBody MerchantDtos.MerchantUpdateRequest request) {
        merchantPortalService.updateMerchantInfo(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("更新成功", null);
    }

    @GetMapping("/service/list")
    public ApiResponse<PageResult<ServiceItem>> serviceList(MerchantDtos.ServiceQuery query) {
        return ApiResponse.success(merchantPortalService.pageServices(authService.requireCurrentUser().getUserId(), query));
    }

    @PostMapping("/service/create")
    public ApiResponse<Void> serviceCreate(@Validated @RequestBody MerchantDtos.ServiceSaveRequest request) {
        merchantPortalService.saveService(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("服务添加成功，等待审核", null);
    }

    @GetMapping("/service/{id}")
    public ApiResponse<ServiceItem> serviceDetail(@PathVariable Long id) {
        return ApiResponse.success(merchantPortalService.getServiceDetail(authService.requireCurrentUser().getUserId(), id));
    }

    @PutMapping("/service/update")
    public ApiResponse<Void> serviceUpdate(@Validated @RequestBody MerchantDtos.ServiceSaveRequest request) {
        merchantPortalService.saveService(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("服务更新成功，等待审核", null);
    }

    @DeleteMapping("/service/{id}")
    public ApiResponse<Void> serviceDelete(@PathVariable Long id) {
        merchantPortalService.deleteService(authService.requireCurrentUser().getUserId(), id);
        return ApiResponse.success("删除成功", null);
    }

    @PostMapping("/service/status")
    public ApiResponse<Void> serviceStatus(@Validated @RequestBody MerchantDtos.ServiceStatusRequest request) {
        merchantPortalService.updateServiceStatus(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("状态更新成功", null);
    }

    @GetMapping("/order/list")
    public ApiResponse<PageResult<Map<String, Object>>> orderList(MerchantDtos.OrderQuery query) {
        return ApiResponse.success(merchantPortalService.pageOrders(authService.requireCurrentUser().getUserId(), query));
    }

    @GetMapping("/order/{id}")
    public ApiResponse<Map<String, Object>> orderDetail(@PathVariable Long id) {
        return ApiResponse.success(merchantPortalService.getOrderDetail(authService.requireCurrentUser().getUserId(), id));
    }

    @PostMapping("/order/accept")
    public ApiResponse<Void> orderAccept(@Validated @RequestBody MerchantDtos.OrderActionRequest request) {
        merchantPortalService.acceptOrder(authService.requireCurrentUser().getUserId(), request.getOrderId());
        return ApiResponse.success("接单成功", null);
    }

    @PostMapping("/order/reject")
    public ApiResponse<Void> orderReject(@Validated @RequestBody MerchantDtos.OrderActionRequest request) {
        merchantPortalService.rejectOrder(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("拒单成功", null);
    }

    @PostMapping("/order/start")
    public ApiResponse<Void> orderStart(@Validated @RequestBody MerchantDtos.OrderActionRequest request) {
        merchantPortalService.startOrder(authService.requireCurrentUser().getUserId(), request.getOrderId());
        return ApiResponse.success("服务已开始", null);
    }

    @PostMapping("/order/complete")
    public ApiResponse<Void> orderComplete(@Validated @RequestBody MerchantDtos.OrderActionRequest request) {
        merchantPortalService.completeOrder(authService.requireCurrentUser().getUserId(), request.getOrderId());
        return ApiResponse.success("服务已完成", null);
    }

    @GetMapping("/review/list")
    public ApiResponse<PageResult<Map<String, Object>>> reviewList(MerchantDtos.ReviewQuery query) {
        return ApiResponse.success(merchantPortalService.pageReviews(authService.requireCurrentUser().getUserId(), query));
    }

    @PostMapping("/review/reply")
    public ApiResponse<Void> reviewReply(@Validated @RequestBody MerchantDtos.ReviewReplyRequest request) {
        merchantPortalService.replyReview(authService.requireCurrentUser().getUserId(), request);
        return ApiResponse.success("回复成功", null);
    }

    @GetMapping("/staff/recruit/overview")
    public ApiResponse<Map<String, Object>> recruitOverview() {
        return ApiResponse.success(merchantPortalService.recruitOverview(authService.requireCurrentUser().getUserId()));
    }

    @GetMapping("/order/communication/{orderId}")
    public ApiResponse<Map<String, Object>> communication(@PathVariable Long orderId) {
        return ApiResponse.success(merchantPortalService.communicationPlaceholder(authService.requireCurrentUser().getUserId(), orderId));
    }
}
