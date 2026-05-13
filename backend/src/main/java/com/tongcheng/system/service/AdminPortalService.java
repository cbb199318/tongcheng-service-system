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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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

    public PageResult<Map<String, Object>> pageUsers(AdminDtos.UserQuery query) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                .orderByDesc(User::getCreateTime);
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.and(w -> w.like(User::getUsername, query.getKeyword())
                    .or()
                    .like(User::getNickname, query.getKeyword())
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
        List<Map<String, Object>> records = page.getRecords().stream()
                .map(this::buildAdminUserView)
                .collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
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
            wrapper.and(w -> w.like(Merchant::getName, query.getKeyword())
                    .or()
                    .like(Merchant::getPhone, query.getKeyword())
                    .or()
                    .like(Merchant::getAddress, query.getKeyword()));
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
        validateAuditRequest(request);
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

    public PageResult<Map<String, Object>> pageServices(AdminDtos.ServiceQuery query) {
        LambdaQueryWrapper<ServiceItem> wrapper = new LambdaQueryWrapper<ServiceItem>()
                .orderByDesc(ServiceItem::getCreateTime);
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.like(ServiceItem::getName, query.getKeyword());
        }
        if (query.getAuditStatus() != null && !query.getAuditStatus().isBlank()) {
            wrapper.eq(ServiceItem::getAuditStatus, query.getAuditStatus());
        }
        Page<ServiceItem> page = serviceItemMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = buildServiceViews(page.getRecords());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getServiceDetail(Long serviceId) {
        return buildServiceView(getServiceEntity(serviceId));
    }

    @Transactional
    public void auditService(AdminDtos.AuditRequest request) {
        validateAuditRequest(request);
        ServiceItem serviceItem = getServiceEntity(request.getId());
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
        long referencedCount = serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getCategoryId, categoryId));
        if (referencedCount > 0) {
            throw AppException.badRequest("该分类已关联服务，无法删除");
        }
        categoryMapper.deleteById(categoryId);
    }

    public PageResult<Map<String, Object>> pageOrders(AdminDtos.OrderQuery query) {
        LambdaQueryWrapper<OrderInfo> wrapper = new LambdaQueryWrapper<OrderInfo>()
                .orderByDesc(OrderInfo::getCreateTime);
        if (query.getOrderNo() != null && !query.getOrderNo().isBlank()) {
            wrapper.like(OrderInfo::getOrderNo, query.getOrderNo());
        }
        if (query.getStatus() != null && !query.getStatus().isBlank()) {
            wrapper.eq(OrderInfo::getStatus, query.getStatus());
        }
        if (query.getStartDate() != null) {
            wrapper.ge(OrderInfo::getCreateTime, query.getStartDate().atStartOfDay());
        }
        if (query.getEndDate() != null) {
            wrapper.lt(OrderInfo::getCreateTime, query.getEndDate().plusDays(1).atStartOfDay());
        }
        Page<OrderInfo> page = orderInfoMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = buildOrderViews(page.getRecords());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getOrderDetail(Long orderId) {
        OrderInfo orderInfo = orderInfoMapper.selectById(orderId);
        if (orderInfo == null) {
            throw AppException.notFound("订单不存在");
        }
        return buildOrderViews(Collections.singletonList(orderInfo)).get(0);
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
        List<OrderInfo> orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .select(OrderInfo::getCreateTime, OrderInfo::getPayTime, OrderInfo::getTotalPrice));
        long todayOrders = orders.stream().filter(order -> order.getCreateTime() != null && order.getCreateTime().toLocalDate().equals(today)).count();
        BigDecimal todayAmount = orders.stream()
                .filter(order -> order.getPayTime() != null && order.getPayTime().toLocalDate().equals(today))
                .map(OrderInfo::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalUsers = userMapper.selectCount(null);
        long pendingMerchantCount = merchantMapper.selectCount(new LambdaQueryWrapper<Merchant>().eq(Merchant::getAuditStatus, "0"));
        long pendingServiceCount = serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>().eq(ServiceItem::getAuditStatus, "0"));
        long pendingAudit = pendingMerchantCount + pendingServiceCount;
        data.put("todayOrders", todayOrders);
        data.put("todayAmount", todayAmount);
        data.put("totalUsers", totalUsers);
        data.put("pendingAudit", pendingAudit);
        data.put("pendingMerchantCount", pendingMerchantCount);
        data.put("pendingServiceCount", pendingServiceCount);
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
        long total = countMap.values().stream().mapToLong(Long::longValue).sum();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, Long> entry : countMap.entrySet()) {
            Category category = categoryMapper.selectById(entry.getKey());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("categoryId", entry.getKey());
            item.put("categoryName", category == null ? "未知分类" : category.getName());
            item.put("count", entry.getValue());
            item.put("type", "service");
            item.put("percentage", total == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(entry.getValue() * 100.0 / total)
                    .setScale(2, RoundingMode.HALF_UP));
            result.add(item);
        }
        return result;
    }

    public List<Map<String, Object>> getMerchantRank(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        List<OrderInfo> orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .select(OrderInfo::getMerchantId));
        Map<Long, Long> countMap = orders.stream()
                .filter(order -> order.getMerchantId() != null)
                .collect(Collectors.groupingBy(OrderInfo::getMerchantId, Collectors.counting()));
        if (countMap.isEmpty()) {
            return Collections.emptyList();
        }
        List<Merchant> merchants = merchantMapper.selectBatchIds(countMap.keySet());
        Map<Long, Merchant> merchantMap = merchants.stream()
                .collect(Collectors.toMap(Merchant::getId, merchant -> merchant));
        return countMap.entrySet().stream()
                .sorted((left, right) -> Long.compare(right.getValue(), left.getValue()))
                .limit(safeLimit)
                .map(entry -> {
                    Merchant merchant = merchantMap.get(entry.getKey());
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("merchantId", entry.getKey());
                    item.put("merchantName", merchant == null ? "未知商家" : merchant.getName());
                    item.put("orderCount", entry.getValue());
                    item.put("rating", merchant == null ? null : merchant.getRating());
                    return item;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildOrderViews(List<OrderInfo> orders) {
        if (orders == null || orders.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> userIds = new HashSet<>();
        Set<Long> merchantIds = new HashSet<>();
        Set<Long> serviceIds = new HashSet<>();
        for (OrderInfo order : orders) {
            if (order.getUserId() != null) {
                userIds.add(order.getUserId());
            }
            if (order.getMerchantId() != null) {
                merchantIds.add(order.getMerchantId());
            }
            if (order.getServiceId() != null) {
                serviceIds.add(order.getServiceId());
            }
        }
        Map<Long, User> userMap = userIds.isEmpty() ? Collections.emptyMap() : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<Long, Merchant> merchantMap = merchantIds.isEmpty() ? Collections.emptyMap() : merchantMapper.selectBatchIds(merchantIds).stream()
                .collect(Collectors.toMap(Merchant::getId, merchant -> merchant));
        Map<Long, ServiceItem> serviceMap = serviceIds.isEmpty() ? Collections.emptyMap() : serviceItemMapper.selectBatchIds(serviceIds).stream()
                .collect(Collectors.toMap(ServiceItem::getId, service -> service));
        return orders.stream()
                .map(order -> buildOrderView(order, userMap, merchantMap, serviceMap))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildServiceViews(List<ServiceItem> services) {
        if (services == null || services.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> merchantIds = new HashSet<>();
        Set<Long> categoryIds = new HashSet<>();
        for (ServiceItem service : services) {
            if (service.getMerchantId() != null) {
                merchantIds.add(service.getMerchantId());
            }
            if (service.getCategoryId() != null) {
                categoryIds.add(service.getCategoryId());
            }
        }
        Map<Long, Merchant> merchantMap = merchantIds.isEmpty() ? Collections.emptyMap() : merchantMapper.selectBatchIds(merchantIds).stream()
                .collect(Collectors.toMap(Merchant::getId, merchant -> merchant));
        Map<Long, Category> categoryMap = categoryIds.isEmpty() ? Collections.emptyMap() : categoryMapper.selectBatchIds(categoryIds).stream()
                .collect(Collectors.toMap(Category::getId, category -> category));
        return services.stream()
                .map(service -> buildServiceView(service, merchantMap, categoryMap))
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildServiceView(ServiceItem serviceItem) {
        Merchant merchant = serviceItem.getMerchantId() == null ? null : merchantMapper.selectById(serviceItem.getMerchantId());
        Category category = serviceItem.getCategoryId() == null ? null : categoryMapper.selectById(serviceItem.getCategoryId());
        return buildServiceView(serviceItem, merchant == null ? Collections.emptyMap() : Collections.singletonMap(merchant.getId(), merchant),
                category == null ? Collections.emptyMap() : Collections.singletonMap(category.getId(), category));
    }

    private Map<String, Object> buildServiceView(ServiceItem serviceItem, Map<Long, Merchant> merchantMap, Map<Long, Category> categoryMap) {
        Merchant merchant = merchantMap.get(serviceItem.getMerchantId());
        Category category = categoryMap.get(serviceItem.getCategoryId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", serviceItem.getId());
        data.put("merchantId", serviceItem.getMerchantId());
        data.put("merchantName", merchant == null ? null : merchant.getName());
        data.put("merchantPhone", merchant == null ? null : merchant.getPhone());
        data.put("categoryId", serviceItem.getCategoryId());
        data.put("categoryName", category == null ? null : category.getName());
        data.put("name", serviceItem.getName());
        data.put("price", serviceItem.getPrice());
        data.put("duration", serviceItem.getDuration());
        data.put("description", serviceItem.getDescription());
        data.put("images", serviceItem.getImages());
        data.put("tags", serviceItem.getTags());
        data.put("sales", serviceItem.getSales());
        data.put("status", serviceItem.getStatus());
        data.put("auditStatus", serviceItem.getAuditStatus());
        data.put("auditRemark", serviceItem.getAuditRemark());
        data.put("createTime", serviceItem.getCreateTime());
        data.put("updateTime", serviceItem.getUpdateTime());
        return data;
    }

    private Map<String, Object> buildOrderView(OrderInfo orderInfo, Map<Long, User> userMap,
                                               Map<Long, Merchant> merchantMap, Map<Long, ServiceItem> serviceMap) {
        User user = userMap.get(orderInfo.getUserId());
        Merchant merchant = merchantMap.get(orderInfo.getMerchantId());
        ServiceItem serviceItem = serviceMap.get(orderInfo.getServiceId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", orderInfo.getId());
        data.put("orderNo", orderInfo.getOrderNo());
        data.put("status", orderInfo.getStatus());
        data.put("address", orderInfo.getAddress());
        data.put("appointDate", orderInfo.getAppointDate());
        data.put("appointSlot", orderInfo.getAppointSlot());
        data.put("remark", orderInfo.getRemark());
        data.put("totalPrice", orderInfo.getTotalPrice());
        data.put("payTime", orderInfo.getPayTime());
        data.put("acceptTime", orderInfo.getAcceptTime());
        data.put("startTime", orderInfo.getStartTime());
        data.put("completeTime", orderInfo.getCompleteTime());
        data.put("cancelTime", orderInfo.getCancelTime());
        data.put("cancelReason", orderInfo.getCancelReason());
        data.put("createTime", orderInfo.getCreateTime());
        data.put("updateTime", orderInfo.getUpdateTime());
        data.put("userName", resolveUserName(user));
        data.put("userPhone", user == null ? null : user.getPhone());
        data.put("merchantName", merchant == null ? null : merchant.getName());
        data.put("serviceName", serviceItem == null ? null : serviceItem.getName());
        data.put("serviceImage", firstImage(serviceItem == null ? null : serviceItem.getImages()));
        data.put("serviceImages", serviceItem == null ? Collections.emptyList() : splitImages(serviceItem.getImages()));
        data.put("user", buildUserLite(user));
        data.put("merchant", buildMerchantLite(merchant));
        data.put("service", buildServiceLite(serviceItem));
        return data;
    }

    private Map<String, Object> buildAdminUserView(User user) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("phone", user.getPhone());
        data.put("avatar", user.getAvatar());
        data.put("role", user.getRole());
        data.put("status", user.getStatus());
        data.put("points", user.getPoints());
        data.put("createTime", user.getCreateTime());
        data.put("updateTime", user.getUpdateTime());
        return data;
    }

    private Map<String, Object> buildUserLite(User user) {
        if (user == null) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("phone", user.getPhone());
        data.put("avatar", user.getAvatar());
        return data;
    }

    private Map<String, Object> buildMerchantLite(Merchant merchant) {
        if (merchant == null) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", merchant.getId());
        data.put("name", merchant.getName());
        data.put("phone", merchant.getPhone());
        data.put("auditStatus", merchant.getAuditStatus());
        data.put("rating", merchant.getRating());
        return data;
    }

    private Map<String, Object> buildServiceLite(ServiceItem serviceItem) {
        if (serviceItem == null) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", serviceItem.getId());
        data.put("name", serviceItem.getName());
        data.put("price", serviceItem.getPrice());
        data.put("duration", serviceItem.getDuration());
        data.put("images", serviceItem.getImages());
        data.put("auditStatus", serviceItem.getAuditStatus());
        data.put("status", serviceItem.getStatus());
        return data;
    }

    private void validateAuditRequest(AdminDtos.AuditRequest request) {
        String status = request.getStatus();
        if (!Objects.equals(status, "0") && !Objects.equals(status, "1") && !Objects.equals(status, "2")) {
            throw AppException.badRequest("审核状态仅支持 0/1/2");
        }
        if (Objects.equals(status, "1") && (request.getRemark() == null || request.getRemark().isBlank())) {
            throw AppException.badRequest("驳回时审核备注不能为空");
        }
    }

    private List<String> splitImages(String images) {
        if (images == null || images.isBlank()) {
            return Collections.emptyList();
        }
        List<String> result = new ArrayList<>();
        for (String item : images.split(",")) {
            String trimmed = item == null ? null : item.trim();
            if (trimmed != null && !trimmed.isBlank()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private String firstImage(String images) {
        List<String> imageList = splitImages(images);
        return imageList.isEmpty() ? null : imageList.get(0);
    }

    private String resolveUserName(User user) {
        if (user == null) {
            return null;
        }
        if (user.getNickname() != null && !user.getNickname().isBlank()) {
            return user.getNickname();
        }
        return user.getUsername();
    }

    private User getUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }
        return user;
    }

    private ServiceItem getServiceEntity(Long serviceId) {
        ServiceItem serviceItem = serviceItemMapper.selectById(serviceId);
        if (serviceItem == null) {
            throw AppException.notFound("服务不存在");
        }
        return serviceItem;
    }
}
