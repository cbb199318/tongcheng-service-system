package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.AdminDtos;
import com.tongcheng.system.entity.Banner;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.Notice;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.security.RequireRole;
import com.tongcheng.system.service.AdminPortalService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequireRole({"admin"})
public class AdminPortalController {

    private final AdminPortalService adminPortalService;

    public AdminPortalController(AdminPortalService adminPortalService) {
        this.adminPortalService = adminPortalService;
    }

    @GetMapping("/user/list")
    public ApiResponse<PageResult<User>> userList(AdminDtos.UserQuery query) {
        return ApiResponse.success(adminPortalService.pageUsers(query));
    }

    @PostMapping("/user/disable")
    public ApiResponse<Void> disableUser(@Validated @RequestBody AdminDtos.UserStatusRequest request) {
        adminPortalService.updateUserStatus(request.getUserId(), 0);
        return ApiResponse.success("禁用成功", null);
    }

    @PostMapping("/user/enable")
    public ApiResponse<Void> enableUser(@Validated @RequestBody AdminDtos.UserStatusRequest request) {
        adminPortalService.updateUserStatus(request.getUserId(), 1);
        return ApiResponse.success("启用成功", null);
    }

    @GetMapping("/merchant/list")
    public ApiResponse<PageResult<Merchant>> merchantList(AdminDtos.MerchantQuery query) {
        return ApiResponse.success(adminPortalService.pageMerchants(query));
    }

    @GetMapping("/merchant/{id}")
    public ApiResponse<Merchant> merchantDetail(@PathVariable Long id) {
        return ApiResponse.success(adminPortalService.getMerchantDetail(id));
    }

    @PostMapping("/merchant/audit")
    public ApiResponse<Void> auditMerchant(@Validated @RequestBody AdminDtos.AuditRequest request) {
        adminPortalService.auditMerchant(request);
        return ApiResponse.success("审核完成", null);
    }

    @GetMapping("/service/list")
    public ApiResponse<PageResult<ServiceItem>> serviceList(AdminDtos.ServiceQuery query) {
        return ApiResponse.success(adminPortalService.pageServices(query));
    }

    @GetMapping("/service/{id}")
    public ApiResponse<ServiceItem> serviceDetail(@PathVariable Long id) {
        return ApiResponse.success(adminPortalService.getServiceDetail(id));
    }

    @PostMapping("/service/audit")
    public ApiResponse<Void> auditService(@Validated @RequestBody AdminDtos.AuditRequest request) {
        adminPortalService.auditService(request);
        return ApiResponse.success("审核完成", null);
    }

    @GetMapping("/category/list")
    public ApiResponse<List<Category>> categoryList() {
        return ApiResponse.success(adminPortalService.listCategories());
    }

    @PostMapping("/category/create")
    public ApiResponse<Void> categoryCreate(@Validated @RequestBody AdminDtos.CategorySaveRequest request) {
        adminPortalService.saveCategory(request);
        return ApiResponse.success("新增成功", null);
    }

    @PutMapping("/category/update")
    public ApiResponse<Void> categoryUpdate(@Validated @RequestBody AdminDtos.CategorySaveRequest request) {
        adminPortalService.saveCategory(request);
        return ApiResponse.success("更新成功", null);
    }

    @DeleteMapping("/category/{id}")
    public ApiResponse<Void> categoryDelete(@PathVariable Long id) {
        adminPortalService.deleteCategory(id);
        return ApiResponse.success("删除成功", null);
    }

    @GetMapping("/order/list")
    public ApiResponse<PageResult<Map<String, Object>>> orderList(AdminDtos.OrderQuery query) {
        return ApiResponse.success(adminPortalService.pageOrders(query));
    }

    @GetMapping("/order/{id}")
    public ApiResponse<Map<String, Object>> orderDetail(@PathVariable Long id) {
        return ApiResponse.success(adminPortalService.getOrderDetail(id));
    }

    @GetMapping("/notice/list")
    public ApiResponse<List<Notice>> noticeList() {
        return ApiResponse.success(adminPortalService.listNotices());
    }

    @PostMapping("/notice/create")
    public ApiResponse<Void> noticeCreate(@Validated @RequestBody AdminDtos.NoticeSaveRequest request) {
        adminPortalService.saveNotice(request);
        return ApiResponse.success("公告发布成功", null);
    }

    @PutMapping("/notice/update")
    public ApiResponse<Void> noticeUpdate(@Validated @RequestBody AdminDtos.NoticeSaveRequest request) {
        adminPortalService.saveNotice(request);
        return ApiResponse.success("公告更新成功", null);
    }

    @DeleteMapping("/notice/{id}")
    public ApiResponse<Void> noticeDelete(@PathVariable Long id) {
        adminPortalService.deleteNotice(id);
        return ApiResponse.success("删除成功", null);
    }

    @GetMapping("/banner/list")
    public ApiResponse<List<Banner>> bannerList() {
        return ApiResponse.success(adminPortalService.listBanners());
    }

    @PostMapping("/banner/create")
    public ApiResponse<Void> bannerCreate(@Validated @RequestBody AdminDtos.BannerSaveRequest request) {
        adminPortalService.saveBanner(request);
        return ApiResponse.success("添加成功", null);
    }

    @PutMapping("/banner/update")
    public ApiResponse<Void> bannerUpdate(@Validated @RequestBody AdminDtos.BannerSaveRequest request) {
        adminPortalService.saveBanner(request);
        return ApiResponse.success("更新成功", null);
    }

    @DeleteMapping("/banner/{id}")
    public ApiResponse<Void> bannerDelete(@PathVariable Long id) {
        adminPortalService.deleteBanner(id);
        return ApiResponse.success("删除成功", null);
    }

    @GetMapping("/statistics/overview")
    public ApiResponse<Map<String, Object>> statisticsOverview() {
        return ApiResponse.success(adminPortalService.getStatisticsOverview());
    }

    @GetMapping("/statistics/order-trend")
    public ApiResponse<List<Map<String, Object>>> orderTrend(@RequestParam(defaultValue = "7") int days) {
        return ApiResponse.success(adminPortalService.getOrderTrend(days));
    }

    @GetMapping("/statistics/category-rate")
    public ApiResponse<List<Map<String, Object>>> categoryRate() {
        return ApiResponse.success(adminPortalService.getCategoryRate());
    }
}
