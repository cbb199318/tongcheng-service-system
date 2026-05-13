package com.tongcheng.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.UserDtos;
import com.tongcheng.system.entity.Banner;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.Notice;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.PointsExchangeRecord;
import com.tongcheng.system.entity.Review;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.StaffMember;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.BannerMapper;
import com.tongcheng.system.mapper.CategoryMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.NoticeMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.PointsExchangeRecordMapper;
import com.tongcheng.system.mapper.ReviewMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.StaffMemberMapper;
import com.tongcheng.system.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class UserPortalService {

    private final BannerMapper bannerMapper;
    private final CategoryMapper categoryMapper;
    private final ServiceItemMapper serviceItemMapper;
    private final MerchantMapper merchantMapper;
    private final NoticeMapper noticeMapper;
    private final ReviewMapper reviewMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final UserMapper userMapper;
    private final PointsExchangeRecordMapper pointsExchangeRecordMapper;
    private final StaffMemberMapper staffMemberMapper;
    private final OrderMessageService orderMessageService;

    public UserPortalService(BannerMapper bannerMapper, CategoryMapper categoryMapper, ServiceItemMapper serviceItemMapper,
                             MerchantMapper merchantMapper, NoticeMapper noticeMapper, ReviewMapper reviewMapper, OrderInfoMapper orderInfoMapper,
                             UserMapper userMapper, PointsExchangeRecordMapper pointsExchangeRecordMapper,
                             StaffMemberMapper staffMemberMapper, OrderMessageService orderMessageService) {
        this.bannerMapper = bannerMapper;
        this.categoryMapper = categoryMapper;
        this.serviceItemMapper = serviceItemMapper;
        this.merchantMapper = merchantMapper;
        this.noticeMapper = noticeMapper;
        this.reviewMapper = reviewMapper;
        this.orderInfoMapper = orderInfoMapper;
        this.userMapper = userMapper;
        this.pointsExchangeRecordMapper = pointsExchangeRecordMapper;
        this.staffMemberMapper = staffMemberMapper;
        this.orderMessageService = orderMessageService;
    }

    public Map<String, Object> getHomeIndex() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("banners", bannerMapper.selectList(new LambdaQueryWrapper<Banner>()
                .eq(Banner::getStatus, 1)
                .orderByAsc(Banner::getSort)));
        data.put("categories", categoryMapper.selectList(new LambdaQueryWrapper<Category>()
                .eq(Category::getStatus, 1)
                .orderByAsc(Category::getSort)));
        data.put("hotServices", serviceItemMapper.selectList(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getStatus, 1)
                .eq(ServiceItem::getAuditStatus, "2")
                .orderByDesc(ServiceItem::getSales)
                .last("limit 6")));
        data.put("recommendedMerchants", merchantMapper.selectList(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getStatus, 1)
                .eq(Merchant::getAuditStatus, "2")
                .orderByDesc(Merchant::getRating)
                .orderByDesc(Merchant::getOrderCount)
                .last("limit 6")));
        data.put("notices", noticeList(5));
        return data;
    }

    public List<Category> listCategories() {
        return categoryMapper.selectList(new LambdaQueryWrapper<Category>()
                .eq(Category::getStatus, 1)
                .orderByAsc(Category::getSort));
    }

    public PageResult<Map<String, Object>> pageServices(UserDtos.ServiceQuery query) {
        LambdaQueryWrapper<ServiceItem> wrapper = new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getStatus, 1)
                .eq(ServiceItem::getAuditStatus, "2");
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.like(ServiceItem::getName, query.getKeyword());
        }
        if (query.getCategoryId() != null) {
            wrapper.eq(ServiceItem::getCategoryId, query.getCategoryId());
        }
        if ("price".equals(query.getSortType())) {
            wrapper.orderByAsc(ServiceItem::getPrice);
            return pageServiceByDatabase(query, wrapper);
        }
        if ("sales".equals(query.getSortType())) {
            wrapper.orderByDesc(ServiceItem::getSales);
            return pageServiceByDatabase(query, wrapper);
        }
        List<ServiceItem> allServices = serviceItemMapper.selectList(wrapper.orderByDesc(ServiceItem::getCreateTime));
        List<Map<String, Object>> records = allServices.stream()
                .map(this::buildServiceCard)
                .collect(Collectors.toList());
        if ("rating".equals(query.getSortType())) {
            records.sort(Comparator.comparing((Map<String, Object> item) ->
                    new BigDecimal(String.valueOf(item.get("merchantRating")))).reversed());
        }
        return manualPage(records, query.getPageNum(), query.getPageSize());
    }

    public Map<String, Object> getServiceDetail(Long id) {
        ServiceItem serviceItem = getAvailableService(id);
        Merchant merchant = getMerchant(serviceItem.getMerchantId());
        List<Review> reviews = reviewMapper.selectList(new LambdaQueryWrapper<Review>()
                .eq(Review::getServiceId, id)
                .orderByDesc(Review::getCreateTime));

        Map<String, Object> data = buildServiceCard(serviceItem);
        data.put("description", serviceItem.getDescription());
        data.put("images", splitImages(serviceItem.getImages()));
        data.put("merchant", merchant);
        data.put("reviews", reviews.stream().map(this::buildReviewView).collect(Collectors.toList()));
        data.put("averageRating", merchant.getRating());
        return data;
    }

    @Transactional
    public Map<String, Object> createOrder(Long userId, UserDtos.CreateOrderRequest request) {
        ServiceItem serviceItem = getAvailableService(request.getServiceId());
        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setOrderNo(DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now()) +
                String.format("%04d", (int) (Math.random() * 10000)));
        orderInfo.setUserId(userId);
        orderInfo.setMerchantId(serviceItem.getMerchantId());
        orderInfo.setServiceId(serviceItem.getId());
        orderInfo.setStatus("0");
        orderInfo.setAddress(request.getAddress());
        orderInfo.setAppointDate(request.getAppointDate());
        orderInfo.setAppointSlot(request.getAppointSlot());
        orderInfo.setRemark(request.getRemark());
        orderInfo.setTotalPrice(serviceItem.getPrice());
        orderInfo.setIsCommented(0);
        orderInfoMapper.insert(orderInfo);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderId", orderInfo.getId());
        data.put("orderNo", orderInfo.getOrderNo());
        data.put("status", orderInfo.getStatus());
        data.put("totalPrice", orderInfo.getTotalPrice());
        return data;
    }

    public PageResult<Map<String, Object>> pageOrders(Long userId, UserDtos.OrderPageQuery query) {
        LambdaQueryWrapper<OrderInfo> wrapper = new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, userId)
                .orderByDesc(OrderInfo::getCreateTime);
        if ("service_pending".equals(query.getStatusGroup())) {
            wrapper.in(OrderInfo::getStatus, Arrays.asList("1", "2", "3"));
        } else if (query.getStatus() != null && !query.getStatus().isBlank()) {
            wrapper.eq(OrderInfo::getStatus, query.getStatus());
        }
        Page<OrderInfo> page = orderInfoMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream().map(this::buildOrderView).collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getOrderDetail(Long userId, Long orderId) {
        OrderInfo orderInfo = getOwnedOrder(userId, orderId);
        return buildOrderView(orderInfo);
    }

    public List<Map<String, Object>> listOrderMessages(Long userId, Long orderId) {
        return orderMessageService.listForUser(userId, orderId);
    }

    @Transactional
    public void sendOrderMessage(Long userId, UserDtos.MessageSendRequest request) {
        orderMessageService.sendForUser(userId, request.getOrderId(), request.getContent());
    }

    @Transactional
    public void payOrder(Long userId, Long orderId) {
        OrderInfo orderInfo = getOwnedOrder(userId, orderId);
        if (!"0".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("订单状态不允许支付");
        }
        orderInfo.setStatus("1");
        orderInfo.setPayTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);
    }

    @Transactional
    public void cancelOrder(Long userId, UserDtos.CancelOrderRequest request) {
        OrderInfo orderInfo = getOwnedOrder(userId, request.getOrderId());
        if (!"0".equals(orderInfo.getStatus()) && !"1".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("当前状态不允许取消订单");
        }
        orderInfo.setStatus("5");
        orderInfo.setCancelReason(request.getReason());
        orderInfo.setCancelTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);
    }

    @Transactional
    public void createReview(Long userId, UserDtos.ReviewCreateRequest request) {
        OrderInfo orderInfo = getOwnedOrder(userId, request.getOrderId());
        if (!"4".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅已完成订单允许评价");
        }
        if (Integer.valueOf(1).equals(orderInfo.getIsCommented())) {
            throw AppException.badRequest("该订单已评价");
        }
        Review review = new Review();
        review.setOrderId(orderInfo.getId());
        review.setUserId(userId);
        review.setMerchantId(request.getMerchantId());
        review.setServiceId(request.getServiceId());
        review.setRating(request.getRating());
        review.setContent(request.getContent());
        review.setImages(joinImages(request.getImages()));
        reviewMapper.insert(review);

        orderInfo.setIsCommented(1);
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);

        updateMerchantRating(orderInfo.getMerchantId());
    }

    @Transactional
    public void applyMerchant(Long userId, UserDtos.MerchantApplyRequest request) {
        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, userId));
        if (merchant == null) {
            merchant = new Merchant();
            merchant.setUserId(userId);
        }
        merchant.setName(request.getName());
        merchant.setPhone(request.getPhone());
        merchant.setAddress(request.getAddress());
        merchant.setIntro(request.getIntro());
        merchant.setLogo(request.getLogo());
        merchant.setLicense(request.getLicense());
        merchant.setAuditStatus("0");
        merchant.setAuditRemark("待审核");
        merchant.setStatus(1);
        merchant.setUpdateTime(LocalDateTime.now());
        if (merchant.getId() == null) {
            merchant.setRating(BigDecimal.valueOf(5.0));
            merchant.setOrderCount(0);
            merchantMapper.insert(merchant);
        } else {
            merchantMapper.updateById(merchant);
        }
    }

    public Merchant getMerchantApplyDetail(Long userId) {
        return merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, userId));
    }

    public Map<String, Object> getPointsInfo(Long userId) {
        User user = getUser(userId);
        return buildPointsInfo(user, "选择积分兑换项后即可提交兑换申请。");
    }

    @Transactional
    public Map<String, Object> exchangePoints(Long userId, UserDtos.PointsExchangeRequest request) {
        User user = getUser(userId);
        Map<String, Object> selectedItem = getPointsItem(request.getItemCode());
        int pointsCost = (Integer) selectedItem.get("pointsCost");
        if (user.getPoints() < pointsCost) {
            throw AppException.badRequest("当前积分不足，无法兑换该权益");
        }

        user.setPoints(user.getPoints() - pointsCost);
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);

        PointsExchangeRecord record = new PointsExchangeRecord();
        record.setUserId(userId);
        record.setItemCode((String) selectedItem.get("code"));
        record.setItemName((String) selectedItem.get("name"));
        record.setPointsCost(pointsCost);
        record.setStatus("1");
        pointsExchangeRecordMapper.insert(record);

        return buildPointsInfo(user, "兑换成功，已扣减 " + pointsCost + " 积分。");
    }

    private List<Notice> noticeList(int limit) {
        return noticeMapper.selectList(new LambdaQueryWrapper<Notice>()
                .eq(Notice::getStatus, 1)
                .orderByDesc(Notice::getCreateTime))
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    private PageResult<Map<String, Object>> pageServiceByDatabase(UserDtos.ServiceQuery query, LambdaQueryWrapper<ServiceItem> wrapper) {
        Page<ServiceItem> page = serviceItemMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream().map(this::buildServiceCard).collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    private PageResult<Map<String, Object>> manualPage(List<Map<String, Object>> data, int pageNum, int pageSize) {
        int start = Math.max((pageNum - 1) * pageSize, 0);
        int end = Math.min(start + pageSize, data.size());
        List<Map<String, Object>> records = start >= data.size() ? Collections.emptyList() : data.subList(start, end);
        return new PageResult<>(records, data.size(), pageNum, pageSize);
    }

    private Map<String, Object> buildServiceCard(ServiceItem serviceItem) {
        Merchant merchant = getMerchant(serviceItem.getMerchantId());
        Category category = categoryMapper.selectById(serviceItem.getCategoryId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", serviceItem.getId());
        data.put("name", serviceItem.getName());
        data.put("price", serviceItem.getPrice());
        data.put("duration", serviceItem.getDuration());
        data.put("description", serviceItem.getDescription());
        data.put("image", firstImage(serviceItem.getImages()));
        data.put("images", splitImages(serviceItem.getImages()));
        data.put("tags", splitTags(serviceItem.getTags()));
        data.put("sales", serviceItem.getSales());
        data.put("merchantId", merchant.getId());
        data.put("merchantName", merchant.getName());
        data.put("merchantRating", merchant.getRating());
        data.put("categoryId", serviceItem.getCategoryId());
        data.put("categoryName", category == null ? null : category.getName());
        data.put("auditStatus", serviceItem.getAuditStatus());
        data.put("status", serviceItem.getStatus());
        return data;
    }

    private Map<String, Object> buildOrderView(OrderInfo orderInfo) {
        ServiceItem serviceItem = serviceItemMapper.selectById(orderInfo.getServiceId());
        Merchant merchant = merchantMapper.selectById(orderInfo.getMerchantId());
        StaffMember staffMember = orderInfo.getStaffId() == null ? null : staffMemberMapper.selectById(orderInfo.getStaffId());
        Review review = reviewMapper.selectOne(new LambdaQueryWrapper<Review>().eq(Review::getOrderId, orderInfo.getId()));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", orderInfo.getId());
        data.put("orderNo", orderInfo.getOrderNo());
        data.put("status", orderInfo.getStatus());
        data.put("address", orderInfo.getAddress());
        data.put("appointDate", orderInfo.getAppointDate());
        data.put("appointSlot", orderInfo.getAppointSlot());
        data.put("remark", orderInfo.getRemark());
        data.put("totalPrice", orderInfo.getTotalPrice());
        data.put("staffId", orderInfo.getStaffId());
        data.put("assignTime", orderInfo.getAssignTime());
        data.put("payTime", orderInfo.getPayTime());
        data.put("acceptTime", orderInfo.getAcceptTime());
        data.put("startTime", orderInfo.getStartTime());
        data.put("completeTime", orderInfo.getCompleteTime());
        data.put("cancelTime", orderInfo.getCancelTime());
        data.put("cancelReason", orderInfo.getCancelReason());
        data.put("isCommented", orderInfo.getIsCommented());
        data.put("createTime", orderInfo.getCreateTime());
        data.put("service", serviceItem == null ? null : buildServiceCard(serviceItem));
        data.put("merchant", merchant);
        data.put("staff", buildStaffLite(staffMember));
        data.put("review", review == null ? null : buildReviewView(review));
        return data;
    }

    private Map<String, Object> buildStaffLite(StaffMember staffMember) {
        if (staffMember == null) {
            return null;
        }
        User user = userMapper.selectById(staffMember.getUserId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", staffMember.getId());
        data.put("userId", staffMember.getUserId());
        data.put("username", user == null ? null : user.getUsername());
        data.put("name", staffMember.getName());
        data.put("phone", staffMember.getPhone());
        data.put("specialty", staffMember.getSpecialty());
        data.put("status", staffMember.getStatus());
        return data;
    }

    private Map<String, Object> buildReviewView(Review review) {
        User user = userMapper.selectById(review.getUserId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", review.getId());
        data.put("orderId", review.getOrderId());
        data.put("rating", review.getRating());
        data.put("content", review.getContent());
        data.put("images", splitImages(review.getImages()));
        data.put("reply", review.getReply());
        data.put("replyTime", review.getReplyTime());
        data.put("createTime", review.getCreateTime());
        data.put("nickname", user == null ? "匿名用户" : user.getNickname());
        return data;
    }

    private ServiceItem getAvailableService(Long serviceId) {
        ServiceItem serviceItem = serviceItemMapper.selectById(serviceId);
        if (serviceItem == null) {
            throw AppException.notFound("服务不存在");
        }
        if (!Integer.valueOf(1).equals(serviceItem.getStatus()) || !"2".equals(serviceItem.getAuditStatus())) {
            throw AppException.badRequest("服务当前不可下单");
        }
        return serviceItem;
    }

    private Merchant getMerchant(Long merchantId) {
        Merchant merchant = merchantMapper.selectById(merchantId);
        if (merchant == null) {
            throw AppException.notFound("商家不存在");
        }
        return merchant;
    }

    private OrderInfo getOwnedOrder(Long userId, Long orderId) {
        OrderInfo orderInfo = orderInfoMapper.selectById(orderId);
        if (orderInfo == null) {
            throw AppException.notFound("订单不存在");
        }
        if (!Objects.equals(orderInfo.getUserId(), userId)) {
            throw AppException.forbidden("无权操作此订单");
        }
        return orderInfo;
    }

    private User getUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }
        return user;
    }

    private void updateMerchantRating(Long merchantId) {
        List<Review> reviews = reviewMapper.selectList(new LambdaQueryWrapper<Review>()
                .eq(Review::getMerchantId, merchantId));
        if (reviews.isEmpty()) {
            return;
        }
        BigDecimal average = reviews.stream()
                .map(review -> BigDecimal.valueOf(review.getRating()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(reviews.size()), 2, RoundingMode.HALF_UP);
        Merchant merchant = getMerchant(merchantId);
        merchant.setRating(average);
        merchant.setUpdateTime(LocalDateTime.now());
        merchantMapper.updateById(merchant);
    }

    private Map<String, Object> buildPointsInfo(User user, String message) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("points", user.getPoints());
        data.put("enabled", true);
        data.put("message", message);
        data.put("items", buildPointsItems(user.getPoints()));
        data.put("records", loadPointsRecords(user.getId()));
        return data;
    }

    private List<Map<String, Object>> buildPointsItems(Integer currentPoints) {
        List<Map<String, Object>> items = new ArrayList<>();
        items.add(pointsItem("coupon_5", "5元服务优惠券", 20, "适合首次体验，兑换后可作为平台优惠权益演示。", currentPoints));
        items.add(pointsItem("priority_booking", "优先预约权益", 60, "热门服务优先排期，突出论文中的积分运营能力。", currentPoints));
        items.add(pointsItem("gift_pack", "精选服务礼包", 100, "用于答辩演示积分兑换场景，兑换结果会记录到历史中。", currentPoints));
        return items;
    }

    private Map<String, Object> pointsItem(String code, String name, int pointsCost, String description, Integer currentPoints) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", code);
        item.put("name", name);
        item.put("pointsCost", pointsCost);
        item.put("description", description);
        item.put("canExchange", currentPoints != null && currentPoints >= pointsCost);
        return item;
    }

    private Map<String, Object> getPointsItem(String itemCode) {
        return buildPointsItems(Integer.MAX_VALUE).stream()
                .filter(item -> Objects.equals(itemCode, item.get("code")))
                .findFirst()
                .orElseThrow(() -> AppException.badRequest("兑换项不存在"));
    }

    private List<Map<String, Object>> loadPointsRecords(Long userId) {
        return pointsExchangeRecordMapper.selectList(new LambdaQueryWrapper<PointsExchangeRecord>()
                        .eq(PointsExchangeRecord::getUserId, userId)
                        .orderByDesc(PointsExchangeRecord::getCreateTime)
                        .last("limit 10"))
                .stream()
                .map(record -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", record.getId());
                    item.put("itemCode", record.getItemCode());
                    item.put("itemName", record.getItemName());
                    item.put("pointsCost", record.getPointsCost());
                    item.put("status", record.getStatus());
                    item.put("statusText", "已兑换");
                    item.put("createTime", record.getCreateTime());
                    return item;
                })
                .collect(Collectors.toList());
    }

    private List<String> splitImages(String images) {
        if (images == null || images.isBlank()) {
            return Collections.emptyList();
        }
        List<String> list = new ArrayList<>();
        for (String value : images.split(",")) {
            if (!value.isBlank()) {
                list.add(value.trim());
            }
        }
        return list;
    }

    private List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(tags.split(","));
    }

    private String firstImage(String images) {
        List<String> list = splitImages(images);
        return list.isEmpty() ? null : list.get(0);
    }

    private String joinImages(List<String> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        return images.stream().filter(Objects::nonNull).collect(Collectors.joining(","));
    }
}
