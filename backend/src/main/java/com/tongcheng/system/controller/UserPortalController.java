package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.UserDtos;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.security.RequireRole;
import com.tongcheng.system.service.AuthService;
import com.tongcheng.system.service.UserPortalService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserPortalController {

    private final UserPortalService userPortalService;
    private final AuthService authService;

    public UserPortalController(UserPortalService userPortalService, AuthService authService) {
        this.userPortalService = userPortalService;
        this.authService = authService;
    }

    @GetMapping("/home/index")
    public ApiResponse<Map<String, Object>> homeIndex() {
        return ApiResponse.success(userPortalService.getHomeIndex());
    }

    @GetMapping("/category/list")
    public ApiResponse<List<Category>> categoryList() {
        return ApiResponse.success(userPortalService.listCategories());
    }

    @GetMapping("/service/list")
    public ApiResponse<PageResult<Map<String, Object>>> serviceList(UserDtos.ServiceQuery query) {
        return ApiResponse.success(userPortalService.pageServices(query));
    }

    @GetMapping("/service/{id}")
    public ApiResponse<Map<String, Object>> serviceDetail(@PathVariable Long id) {
        return ApiResponse.success(userPortalService.getServiceDetail(id));
    }

    @PostMapping("/order/create")
    @RequireRole({"user"})
    public ApiResponse<Map<String, Object>> createOrder(@Validated @RequestBody UserDtos.CreateOrderRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success("创建成功", userPortalService.createOrder(userId, request));
    }

    @GetMapping("/order/list")
    @RequireRole({"user"})
    public ApiResponse<PageResult<Map<String, Object>>> orderList(UserDtos.OrderPageQuery query) {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success(userPortalService.pageOrders(userId, query));
    }

    @GetMapping("/order/{id}")
    @RequireRole({"user"})
    public ApiResponse<Map<String, Object>> orderDetail(@PathVariable Long id) {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success(userPortalService.getOrderDetail(userId, id));
    }

    @GetMapping("/order/message/list")
    @RequireRole({"user"})
    public ApiResponse<List<Map<String, Object>>> orderMessageList(@RequestParam Long orderId) {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success(userPortalService.listOrderMessages(userId, orderId));
    }

    @PostMapping("/order/message/send")
    @RequireRole({"user"})
    public ApiResponse<Void> orderMessageSend(@Validated @RequestBody UserDtos.MessageSendRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        userPortalService.sendOrderMessage(userId, request);
        return ApiResponse.success("发送成功", null);
    }

    @PostMapping("/order/pay")
    @RequireRole({"user"})
    public ApiResponse<Void> payOrder(@Validated @RequestBody UserDtos.OrderActionRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        userPortalService.payOrder(userId, request.getOrderId());
        return ApiResponse.success("支付成功", null);
    }

    @PostMapping("/order/cancel")
    @RequireRole({"user"})
    public ApiResponse<Void> cancelOrder(@Validated @RequestBody UserDtos.CancelOrderRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        userPortalService.cancelOrder(userId, request);
        return ApiResponse.success("取消成功", null);
    }

    @PostMapping("/review/create")
    @RequireRole({"user"})
    public ApiResponse<Void> reviewCreate(@Validated @RequestBody UserDtos.ReviewCreateRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        userPortalService.createReview(userId, request);
        return ApiResponse.success("评价成功", null);
    }

    @PostMapping("/merchant/apply")
    @RequireRole({"user"})
    public ApiResponse<Void> merchantApply(@Validated @RequestBody UserDtos.MerchantApplyRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        userPortalService.applyMerchant(userId, request);
        return ApiResponse.success("申请提交成功，请等待审核", null);
    }

    @GetMapping("/merchant/apply/detail")
    @RequireRole({"user", "merchant"})
    public ApiResponse<Merchant> merchantApplyDetail() {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success(userPortalService.getMerchantApplyDetail(userId));
    }

    @GetMapping("/points/info")
    @RequireRole({"user"})
    public ApiResponse<Map<String, Object>> pointsInfo() {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success(userPortalService.getPointsInfo(userId));
    }

    @PostMapping("/points/exchange")
    @RequireRole({"user"})
    public ApiResponse<Map<String, Object>> pointsExchange(@Validated @RequestBody UserDtos.PointsExchangeRequest request) {
        Long userId = authService.requireCurrentUser().getUserId();
        return ApiResponse.success(userPortalService.exchangePoints(userId, request));
    }
}
