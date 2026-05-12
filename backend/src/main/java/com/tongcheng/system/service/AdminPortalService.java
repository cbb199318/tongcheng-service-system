package com.tongcheng.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.AdminDtos;
import com.tongcheng.system.entity.Banner;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.Notice;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.BannerMapper;
import com.tongcheng.system.mapper.CategoryMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.NoticeMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AdminPortalService {

    private final UserMapper userMapper;
    private final MerchantMapper merchantMapper;
    private final ServiceItemMapper serviceItemMapper;
    private final CategoryMapper categoryMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final NoticeMapper noticeMapper;
    private final BannerMapper bannerMapper;

    public AdminPortalService(UserMapper userMapper, MerchantMapper merchantMapper, ServiceItemMapper serviceItemMapper,
                              CategoryMapper categoryMapper, OrderInfoMapper orderInfoMapper, NoticeMapper noticeMapper,
                              BannerMapper bannerMapper) {
        this.userMapper = userMapper;
        this.merchantMapper = merchantMapper;
        this.serviceItemMapper = serviceItemMapper;
        this.categoryMapper = categoryMapper;
        this.orderInfoMapper = orderInfoMapper;
        this.noticeMapper = noticeMapper;
        this.bannerMapper = bannerMapper;
    }

    public PageResult<User> pageUsers(AdminDtos.UserQuery query) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .orderByDesc(User::getCreateTime);
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.and(w -> w.like(User::getUsername, query.getKeyword())
                    .or()
                    .like(User::getPhone, query.getKeyword()));
        }
        if (query.getRole() != null && !query.getRole().isBlank()) {
            wrapper.eq(User::getRole, query.getRole());
        }
        if (query.getStatus() != null) {
            wrapper.eq(User::getStatus, query.getStatus());
        }
        Page<User> page = userMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        return PageResult.of(page);
    }

    @Transactional
    public void updateUserStatus(Long userId, int status) {
        User user = getUser(userId);
        user.setStatus(status);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
    }

    public PageResult<Merchant> pageMerchants(AdminDtos.MerchantQuery query) {
        LambdaQueryWrapper<Merchant> wrapper = new LambdaQueryWrapper<Merchant>()
                .orderByDesc(Merchant::getCreateTime);
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.like(Merchant::getName, query.getKeyword());
        }
        if (query.getAuditStatus() != null && !query.getAuditStatus().isBlank()) {
            wrapper.eq(Merchant::getAuditStatus, query.getAuditStatus());
        }
        Page<Merchant> page = merchantMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        return PageResult.of(page);
    }

    public Merchant getMerchantDetail(Long merchantId) {
        Merchant merchant = merchantMapper.selectById(merchantId);
        if (merchant == null) {
            throw AppException.notFound("商家不存在");
        }
        return merchant;
    }

    @Transactional
    public void auditMerchant(AdminDtos.AuditRequest request) {
        Merchant merchant = getMerchantDetail(request.getId());
        merchant.setAuditStatus(request.getStatus());
        merchant.setAuditRemark(request.getRemark());
        merchant.setUpdateTime(LocalDateTime.now());
        merchantMapper.updateById(merchant);

        if ("2".equals(request.getStatus())) {
            User user = getUser(merchant.getUserId());
            user.setRole("merchant");
            user.setUpdateTime(LocalDateTime.now());
            userMapper.updateById(user);
        }
    }

    public PageResult<ServiceItem> pageServices(AdminDtos.ServiceQuery query) {
        LambdaQueryWrapper<ServiceItem> wrapper = new LambdaQueryWrapper<ServiceItem>()
                .orderByDesc(ServiceItem::getCreateTime);
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.like(ServiceItem::getName, query.getKeyword());
        }
        if (query.getAuditStatus() != null && !query.getAuditStatus().isBlank()) {
            wrapper.eq(ServiceItem::getAuditStatus, query.getAuditStatus());
        }
        Page<ServiceItem> page = serviceItemMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        return PageResult.of(page);
    }

    public ServiceItem getServiceDetail(Long serviceId) {
        ServiceItem serviceItem = serviceItemMapper.selectById(serviceId);
        if (serviceItem == null) {
            throw AppException.notFound("服务不存在");
        }
        return serviceItem;
    }

    @Transactional
    public void auditService(AdminDtos.AuditRequest request) {
        ServiceItem serviceItem = getServiceDetail(request.getId());
        serviceItem.setAuditStatus(request.getStatus());
        serviceItem.setAuditRemark(request.getRemark());
        serviceItem.setUpdateTime(LocalDateTime.now());
        serviceItemMapper.updateById(serviceItem);
    }

    public List<Category> listCategories() {
        return categoryMapper.selectList(new LambdaQueryWrapper<Category>().orderByAsc(Category::getSort));
    }

    @Transactional
    public void saveCategory(AdminDtos.CategorySaveRequest request) {
        Category category = request.getId() == null ? new Category() : categoryMapper.selectById(request.getId());
        if (request.getId() != null && category == null) {
            throw AppException.notFound("分类不存在");
        }
        if (category == null) {
            category = new Category();
        }
        category.setName(request.getName());
        category.setIcon(request.getIcon());
        category.setSort(request.getSort());
        category.setStatus(request.getStatus());
        category.setUpdateTime(LocalDateTime.now());
        if (category.getId() == null) {
            categoryMapper.insert(category);
        } else {
            categoryMapper.updateById(category);
        }
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        categoryMapper.deleteById(categoryId);
    }

    public PageResult<Map<String, Object>> pageOrders(AdminDtos.OrderQuery query) {
        LambdaQueryWrapper<OrderInfo> wrapper = new LambdaQueryWrapper<OrderInfo>()
                .orderByDesc(OrderInfo::getCreateTime);
        if (query.getOrderNo() != null && !query.getOrderNo().isBlank()) {
            wrapper.eq(OrderInfo::getOrderNo, query.getOrderNo());
        }
        if (query.getStatus() != null && !query.getStatus().isBlank()) {
            wrapper.eq(OrderInfo::getStatus, query.getStatus());
        }
        Page<OrderInfo> page = orderInfoMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream()
                .filter(order -> withinDateRange(order, query.getStartDate(), query.getEndDate()))
                .map(this::buildOrderView)
                .collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getOrderDetail(Long orderId) {
        OrderInfo orderInfo = orderInfoMapper.selectById(orderId);
        if (orderInfo == null) {
            throw AppException.notFound("订单不存在");
        }
        return buildOrderView(orderInfo);
    }

    public List<Notice> listNotices() {
        return noticeMapper.selectList(new LambdaQueryWrapper<Notice>().orderByDesc(Notice::getCreateTime));
    }

    @Transactional
    public void saveNotice(AdminDtos.NoticeSaveRequest request) {
        Notice notice = request.getId() == null ? new Notice() : noticeMapper.selectById(request.getId());
        if (request.getId() != null && notice == null) {
            throw AppException.notFound("公告不存在");
        }
        if (notice == null) {
            notice = new Notice();
        }
        notice.setTitle(request.getTitle());
        notice.setContent(request.getContent());
        notice.setStatus(request.getStatus());
        notice.setUpdateTime(LocalDateTime.now());
        if (notice.getId() == null) {
            noticeMapper.insert(notice);
        } else {
            noticeMapper.updateById(notice);
        }
    }

    @Transactional
    public void deleteNotice(Long id) {
        noticeMapper.deleteById(id);
    }

    public List<Banner> listBanners() {
        return bannerMapper.selectList(new LambdaQueryWrapper<Banner>().orderByAsc(Banner::getSort));
    }

    @Transactional
    public void saveBanner(AdminDtos.BannerSaveRequest request) {
        Banner banner = request.getId() == null ? new Banner() : bannerMapper.selectById(request.getId());
        if (request.getId() != null && banner == null) {
            throw AppException.notFound("轮播图不存在");
        }
        if (banner == null) {
            banner = new Banner();
        }
        banner.setTitle(request.getTitle());
        banner.setImageUrl(request.getImageUrl());
        banner.setLinkUrl(request.getLinkUrl());
        banner.setSort(request.getSort());
        banner.setStatus(request.getStatus());
        banner.setUpdateTime(LocalDateTime.now());
        if (banner.getId() == null) {
            bannerMapper.insert(banner);
        } else {
            bannerMapper.updateById(banner);
        }
    }

    @Transactional
    public void deleteBanner(Long id) {
        bannerMapper.deleteById(id);
    }

    public Map<String, Object> getStatisticsOverview() {
        Map<String, Object> data = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        List<OrderInfo> orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>());
        long todayOrders = orders.stream().filter(order -> order.getCreateTime() != null && order.getCreateTime().toLocalDate().equals(today)).count();
        BigDecimal todayAmount = orders.stream()
                .filter(order -> order.getPayTime() != null && order.getPayTime().toLocalDate().equals(today))
                .map(OrderInfo::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalUsers = userMapper.selectCount(null);
        long pendingAudit = merchantMapper.selectCount(new LambdaQueryWrapper<Merchant>().eq(Merchant::getAuditStatus, "0"));
        data.put("todayOrders", todayOrders);
        data.put("todayAmount", todayAmount);
        data.put("totalUsers", totalUsers);
        data.put("pendingAudit", pendingAudit);
        return data;
    }

    public List<Map<String, Object>> getOrderTrend(int days) {
        List<Map<String, Object>> trend = new ArrayList<>();
        List<OrderInfo> orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>());
        for (int i = days - 1; i >= 0; i--) {
            LocalDate target = LocalDate.now().minusDays(i);
            long count = orders.stream()
                    .filter(order -> order.getCreateTime() != null && order.getCreateTime().toLocalDate().equals(target))
                    .count();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", target.toString());
            item.put("count", count);
            trend.add(item);
        }
        return trend;
    }

    public List<Map<String, Object>> getCategoryRate() {
        List<ServiceItem> services = serviceItemMapper.selectList(new LambdaQueryWrapper<ServiceItem>().eq(ServiceItem::getAuditStatus, "2"));
        Map<Long, Long> countMap = services.stream()
                .collect(Collectors.groupingBy(ServiceItem::getCategoryId, Collectors.counting()));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, Long> entry : countMap.entrySet()) {
            Category category = categoryMapper.selectById(entry.getKey());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("categoryId", entry.getKey());
            item.put("categoryName", category == null ? "未知分类" : category.getName());
            item.put("count", entry.getValue());
            result.add(item);
        }
        return result;
    }

    private boolean withinDateRange(OrderInfo orderInfo, LocalDate startDate, LocalDate endDate) {
        if (orderInfo.getCreateTime() == null) {
            return true;
        }
        LocalDate current = orderInfo.getCreateTime().toLocalDate();
        if (startDate != null && current.isBefore(startDate)) {
            return false;
        }
        if (endDate != null && current.isAfter(endDate)) {
            return false;
        }
        return true;
    }

    private Map<String, Object> buildOrderView(OrderInfo orderInfo) {
        User user = userMapper.selectById(orderInfo.getUserId());
        Merchant merchant = merchantMapper.selectById(orderInfo.getMerchantId());
        ServiceItem serviceItem = serviceItemMapper.selectById(orderInfo.getServiceId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", orderInfo.getId());
        data.put("orderNo", orderInfo.getOrderNo());
        data.put("status", orderInfo.getStatus());
        data.put("address", orderInfo.getAddress());
        data.put("appointDate", orderInfo.getAppointDate());
        data.put("appointSlot", orderInfo.getAppointSlot());
        data.put("totalPrice", orderInfo.getTotalPrice());
        data.put("cancelReason", orderInfo.getCancelReason());
        data.put("createTime", orderInfo.getCreateTime());
        data.put("user", user);
        data.put("merchant", merchant);
        data.put("service", serviceItem);
        return data;
    }

    private User getUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }
        return user;
    }
}
