package com.tongcheng.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.MerchantDtos;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.Review;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.StaffMember;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.CategoryMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ReviewMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.StaffMemberMapper;
import com.tongcheng.system.mapper.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class MerchantPortalService {

    private final MerchantMapper merchantMapper;
    private final ServiceItemMapper serviceItemMapper;
    private final CategoryMapper categoryMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final ReviewMapper reviewMapper;
    private final UserMapper userMapper;
    private final StaffMemberMapper staffMemberMapper;
    private final PasswordEncoder passwordEncoder;
    private final OrderMessageService orderMessageService;
    private static final String STAFF_INIT_PASSWORD = "123456";

    public MerchantPortalService(MerchantMapper merchantMapper, ServiceItemMapper serviceItemMapper, CategoryMapper categoryMapper,
                                 OrderInfoMapper orderInfoMapper, ReviewMapper reviewMapper, UserMapper userMapper,
                                 StaffMemberMapper staffMemberMapper, PasswordEncoder passwordEncoder,
                                 OrderMessageService orderMessageService) {
        this.merchantMapper = merchantMapper;
        this.serviceItemMapper = serviceItemMapper;
        this.categoryMapper = categoryMapper;
        this.orderInfoMapper = orderInfoMapper;
        this.reviewMapper = reviewMapper;
        this.userMapper = userMapper;
        this.staffMemberMapper = staffMemberMapper;
        this.passwordEncoder = passwordEncoder;
        this.orderMessageService = orderMessageService;
    }

    public Map<String, Object> getMerchantAuthInfo(Long userId) {
        Merchant merchant = getMerchantByUserId(userId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("merchantId", merchant.getId());
        data.put("name", merchant.getName());
        data.put("phone", merchant.getPhone());
        data.put("auditStatus", merchant.getAuditStatus());
        data.put("status", merchant.getStatus());
        return data;
    }

    public Merchant getMerchantDetail(Long userId) {
        return getMerchantByUserId(userId);
    }

    public Map<String, Object> getDashboardSummary(Long userId) {
        Merchant merchant = getMerchantByUserId(userId);
        Long merchantId = merchant.getId();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("merchantId", merchantId);
        data.put("merchantName", merchant.getName());
        data.put("auditStatus", merchant.getAuditStatus());
        data.put("rating", merchant.getRating());
        data.put("orderCount", merchant.getOrderCount());
        data.put("serviceCount", serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchantId)));
        data.put("pendingAuditServiceCount", serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchantId)
                .eq(ServiceItem::getAuditStatus, "0")));
        data.put("approvedServiceCount", serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchantId)
                .eq(ServiceItem::getAuditStatus, "2")));
        data.put("onShelfServiceCount", serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchantId)
                .eq(ServiceItem::getStatus, 1)));
        data.put("offShelfServiceCount", serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchantId)
                .eq(ServiceItem::getStatus, 0)));
        data.put("pendingOrderCount", countOrdersByStatus(merchantId, "1"));
        data.put("acceptedOrderCount", countOrdersByStatus(merchantId, "2"));
        data.put("inServiceOrderCount", countOrdersByStatus(merchantId, "3"));
        data.put("completedOrderCount", countOrdersByStatus(merchantId, "4"));
        data.put("cancelledOrderCount", countOrdersByStatus(merchantId, "5"));
        data.put("staffCount", staffMemberMapper.selectCount(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchantId)));
        data.put("activeStaffCount", staffMemberMapper.selectCount(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchantId)
                .eq(StaffMember::getStatus, 1)));
        data.put("inactiveStaffCount", staffMemberMapper.selectCount(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchantId)
                .eq(StaffMember::getStatus, 0)));
        data.put("pendingReplyReviewCount", reviewMapper.selectCount(new LambdaQueryWrapper<Review>()
                .eq(Review::getMerchantId, merchantId)
                .and(wrapper -> wrapper.isNull(Review::getReply).or().eq(Review::getReply, ""))));
        data.put("repliedReviewCount", reviewMapper.selectCount(new LambdaQueryWrapper<Review>()
                .eq(Review::getMerchantId, merchantId)
                .isNotNull(Review::getReply)
                .ne(Review::getReply, "")));
        return data;
    }

    @Transactional
    public void updateMerchantInfo(Long userId, MerchantDtos.MerchantUpdateRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        merchant.setName(request.getName());
        merchant.setPhone(request.getPhone());
        merchant.setAddress(request.getAddress());
        merchant.setIntro(request.getIntro());
        merchant.setLogo(request.getLogo());
        if (request.getLicense() != null && !request.getLicense().isBlank()) {
            merchant.setLicense(request.getLicense());
        }
        merchant.setAuditStatus("0");
        merchant.setAuditRemark("资料更新待审核");
        merchant.setUpdateTime(LocalDateTime.now());
        merchantMapper.updateById(merchant);
    }

    public PageResult<Map<String, Object>> pageServices(Long userId, MerchantDtos.ServiceQuery query) {
        Merchant merchant = getMerchantByUserId(userId);
        LambdaQueryWrapper<ServiceItem> wrapper = new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant.getId())
                .orderByDesc(ServiceItem::getCreateTime);
        if (query.getName() != null && !query.getName().isBlank()) {
            wrapper.like(ServiceItem::getName, query.getName());
        }
        if (query.getAuditStatus() != null && !query.getAuditStatus().isBlank()) {
            wrapper.eq(ServiceItem::getAuditStatus, query.getAuditStatus());
        }
        if (query.getStatus() != null && !query.getStatus().isBlank()) {
            wrapper.eq(ServiceItem::getStatus, Integer.parseInt(query.getStatus()));
        }
        Page<ServiceItem> page = serviceItemMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream()
                .map(this::buildServiceView)
                .collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Transactional
    public void saveService(Long userId, MerchantDtos.ServiceSaveRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        Category category = categoryMapper.selectById(request.getCategoryId());
        if (category == null) {
            throw AppException.notFound("分类不存在");
        }
        boolean isCreate = request.getId() == null;
        ServiceItem serviceItem = isCreate ? new ServiceItem() : getOwnedService(merchant.getId(), request.getId());
        serviceItem.setMerchantId(merchant.getId());
        serviceItem.setCategoryId(request.getCategoryId());
        serviceItem.setName(request.getName());
        serviceItem.setPrice(request.getPrice());
        serviceItem.setDuration(request.getDuration());
        serviceItem.setDescription(request.getDescription());
        serviceItem.setImages(request.getImages());
        serviceItem.setTags(request.getTags());
        serviceItem.setAuditStatus("0");
        serviceItem.setAuditRemark("待审核");
        serviceItem.setUpdateTime(LocalDateTime.now());
        if (isCreate) {
            serviceItem.setStatus(1);
            serviceItem.setSales(0);
            serviceItemMapper.insert(serviceItem);
            return;
        }
        serviceItemMapper.updateById(serviceItem);
    }

    public Map<String, Object> getServiceDetail(Long userId, Long serviceId) {
        Merchant merchant = getMerchantByUserId(userId);
        return buildServiceView(getOwnedService(merchant.getId(), serviceId));
    }

    @Transactional
    public void deleteService(Long userId, Long serviceId) {
        Merchant merchant = getMerchantByUserId(userId);
        ServiceItem serviceItem = getOwnedService(merchant.getId(), serviceId);
        Long relatedOrderCount = orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getServiceId, serviceItem.getId()));
        if (relatedOrderCount != null && relatedOrderCount > 0) {
            throw AppException.badRequest("该服务已有关联订单，暂不允许删除");
        }
        serviceItemMapper.deleteById(serviceItem.getId());
    }

    @Transactional
    public void updateServiceStatus(Long userId, MerchantDtos.ServiceStatusRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        ServiceItem serviceItem = getOwnedService(merchant.getId(), request.getServiceId());
        serviceItem.setStatus(request.getStatus());
        serviceItem.setUpdateTime(LocalDateTime.now());
        serviceItemMapper.updateById(serviceItem);
    }

    public PageResult<Map<String, Object>> pageOrders(Long userId, MerchantDtos.OrderQuery query) {
        Merchant merchant = getMerchantByUserId(userId);
        LambdaQueryWrapper<OrderInfo> wrapper = new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getMerchantId, merchant.getId())
                .orderByDesc(OrderInfo::getCreateTime);
        if (query.getStatus() != null && !query.getStatus().isBlank()) {
            wrapper.eq(OrderInfo::getStatus, query.getStatus());
        }
        if (query.getOrderNo() != null && !query.getOrderNo().isBlank()) {
            wrapper.eq(OrderInfo::getOrderNo, query.getOrderNo());
        }
        Page<OrderInfo> page = orderInfoMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream()
                .map(this::buildOrderView)
                .collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getOrderDetail(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), orderId);
        return buildOrderView(orderInfo);
    }

    public List<Map<String, Object>> pageStaff(Long userId, MerchantDtos.StaffQuery query) {
        Merchant merchant = getMerchantByUserId(userId);
        LambdaQueryWrapper<StaffMember> wrapper = new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchant.getId())
                .orderByDesc(StaffMember::getCreateTime);
        if (query.getStatus() != null) {
            wrapper.eq(StaffMember::getStatus, query.getStatus());
        }
        if (query.getKeyword() != null && !query.getKeyword().isBlank()) {
            wrapper.and(w -> w.like(StaffMember::getName, query.getKeyword())
                    .or()
                    .like(StaffMember::getPhone, query.getKeyword()));
        }
        return staffMemberMapper.selectList(wrapper).stream()
                .map(this::buildStaffView)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> createStaff(Long userId, MerchantDtos.StaffSaveRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        User staffUser = new User();
        staffUser.setUsername(generateStaffUsername(merchant.getId()));
        staffUser.setPassword(passwordEncoder.encode(STAFF_INIT_PASSWORD));
        staffUser.setNickname(request.getName());
        staffUser.setPhone(request.getPhone());
        staffUser.setRole("staff");
        staffUser.setStatus(1);
        staffUser.setPoints(0);
        staffUser.setCreateTime(LocalDateTime.now());
        staffUser.setUpdateTime(LocalDateTime.now());
        userMapper.insert(staffUser);

        StaffMember staffMember = new StaffMember();
        staffMember.setUserId(staffUser.getId());
        staffMember.setMerchantId(merchant.getId());
        staffMember.setName(request.getName());
        staffMember.setPhone(request.getPhone());
        staffMember.setSpecialty(request.getSpecialty());
        staffMember.setStatus(1);
        staffMember.setCreateTime(LocalDateTime.now());
        staffMember.setUpdateTime(LocalDateTime.now());
        staffMemberMapper.insert(staffMember);

        Map<String, Object> data = buildStaffView(staffMember);
        data.put("username", staffUser.getUsername());
        data.put("initialPassword", STAFF_INIT_PASSWORD);
        return data;
    }

    @Transactional
    public void updateStaff(Long userId, MerchantDtos.StaffSaveRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        if (request.getId() == null) {
            throw AppException.badRequest("员工ID不能为空");
        }
        StaffMember staffMember = getOwnedStaff(merchant.getId(), request.getId());
        staffMember.setName(request.getName());
        staffMember.setPhone(request.getPhone());
        staffMember.setSpecialty(request.getSpecialty());
        staffMember.setUpdateTime(LocalDateTime.now());
        staffMemberMapper.updateById(staffMember);

        User staffUser = userMapper.selectById(staffMember.getUserId());
        if (staffUser != null) {
            staffUser.setNickname(request.getName());
            staffUser.setPhone(request.getPhone());
            staffUser.setUpdateTime(LocalDateTime.now());
            userMapper.updateById(staffUser);
        }
    }

    @Transactional
    public void updateStaffStatus(Long userId, MerchantDtos.StaffStatusRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        if (!Integer.valueOf(0).equals(request.getStatus()) && !Integer.valueOf(1).equals(request.getStatus())) {
            throw AppException.badRequest("员工状态仅支持 0/1");
        }
        StaffMember staffMember = getOwnedStaff(merchant.getId(), request.getStaffId());
        staffMember.setStatus(request.getStatus());
        staffMember.setUpdateTime(LocalDateTime.now());
        staffMemberMapper.updateById(staffMember);

        User staffUser = userMapper.selectById(staffMember.getUserId());
        if (staffUser != null) {
            staffUser.setStatus(request.getStatus());
            staffUser.setUpdateTime(LocalDateTime.now());
            userMapper.updateById(staffUser);
        }
    }

    @Transactional
    public Map<String, Object> resetStaffPassword(Long userId, Long staffId) {
        Merchant merchant = getMerchantByUserId(userId);
        StaffMember staffMember = getOwnedStaff(merchant.getId(), staffId);
        User staffUser = userMapper.selectById(staffMember.getUserId());
        if (staffUser == null) {
            throw AppException.notFound("员工账号不存在");
        }
        staffUser.setPassword(passwordEncoder.encode(STAFF_INIT_PASSWORD));
        staffUser.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(staffUser);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("staffId", staffMember.getId());
        data.put("username", staffUser.getUsername());
        data.put("password", STAFF_INIT_PASSWORD);
        return data;
    }

    @Transactional
    public void acceptOrder(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), orderId);
        if (!"1".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅待接单订单允许接单");
        }
        orderInfo.setStatus("2");
        orderInfo.setAcceptTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);
    }

    @Transactional
    public void rejectOrder(Long userId, MerchantDtos.OrderRejectRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw AppException.badRequest("拒单原因不能为空");
        }
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), request.getOrderId());
        if (!"1".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅待接单订单允许拒单");
        }
        orderInfo.setStatus("5");
        orderInfo.setCancelReason(request.getReason().trim());
        orderInfo.setCancelTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);
    }

    @Transactional
    public void assignStaff(Long userId, MerchantDtos.OrderAssignStaffRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), request.getOrderId());
        if (!"2".equals(orderInfo.getStatus()) && !"3".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅已接单或服务中订单允许分配服务人员");
        }
        StaffMember staffMember = getOwnedStaff(merchant.getId(), request.getStaffId());
        if (!Integer.valueOf(1).equals(staffMember.getStatus())) {
            throw AppException.badRequest("仅在职员工允许分配订单");
        }
        orderInfo.setStaffId(staffMember.getId());
        orderInfo.setAssignTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);
    }

    @Transactional
    public void startOrder(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), orderId);
        if (!"2".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅已接单订单允许开始服务");
        }
        orderInfo.setStatus("3");
        orderInfo.setStartTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);
    }

    @Transactional
    public void completeOrder(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), orderId);
        if (!"3".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅服务中订单允许完成");
        }
        orderInfo.setStatus("4");
        orderInfo.setCompleteTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.updateById(orderInfo);

        ServiceItem serviceItem = serviceItemMapper.selectById(orderInfo.getServiceId());
        if (serviceItem != null) {
            serviceItem.setSales(defaultZero(serviceItem.getSales()) + 1);
            serviceItem.setUpdateTime(LocalDateTime.now());
            serviceItemMapper.updateById(serviceItem);
        }
        merchant.setOrderCount(defaultZero(merchant.getOrderCount()) + 1);
        merchant.setUpdateTime(LocalDateTime.now());
        merchantMapper.updateById(merchant);
    }

    public List<Map<String, Object>> listOrderMessages(Long userId, Long orderId) {
        return orderMessageService.listForMerchant(userId, orderId);
    }

    @Transactional
    public void sendOrderMessage(Long userId, MerchantDtos.MessageSendRequest request) {
        orderMessageService.sendForMerchant(userId, request.getOrderId(), request.getContent());
    }

    public PageResult<Map<String, Object>> pageReviews(Long userId, MerchantDtos.ReviewQuery query) {
        Merchant merchant = getMerchantByUserId(userId);
        LambdaQueryWrapper<Review> wrapper = new LambdaQueryWrapper<Review>()
                .eq(Review::getMerchantId, merchant.getId())
                .orderByDesc(Review::getCreateTime);
        if (query.getHasReply() != null) {
            if (query.getHasReply() == 1) {
                wrapper.isNotNull(Review::getReply).ne(Review::getReply, "");
            } else {
                wrapper.and(w -> w.isNull(Review::getReply).or().eq(Review::getReply, ""));
            }
        }
        Page<Review> page = reviewMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream()
                .map(this::buildReviewView)
                .collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Transactional
    public void replyReview(Long userId, MerchantDtos.ReviewReplyRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        Review review = reviewMapper.selectById(request.getReviewId());
        if (review == null) {
            throw AppException.notFound("评价不存在");
        }
        if (!Objects.equals(review.getMerchantId(), merchant.getId())) {
            throw AppException.forbidden("无权操作该评价");
        }
        review.setReply(request.getReply());
        review.setReplyTime(LocalDateTime.now());
        review.setUpdateTime(LocalDateTime.now());
        reviewMapper.updateById(review);
    }

    public Map<String, Object> recruitOverview(Long userId) {
        Merchant merchant = getMerchantByUserId(userId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("merchantId", merchant.getId());
        data.put("status", "reserved");
        data.put("staffCount", staffMemberMapper.selectCount(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchant.getId())));
        data.put("message", "招募能力仍为二期预留，当前可先通过员工管理完成人员录入与账号生成");
        return data;
    }

    public Map<String, Object> communicationPlaceholder(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        getOwnedOrder(merchant.getId(), orderId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderId", orderId);
        data.put("status", "enabled");
        data.put("messages", listOrderMessages(userId, orderId));
        data.put("message", "当前已启用订单文本沟通，一期保留为列表式消息流");
        return data;
    }

    private Merchant getMerchantByUserId(Long userId) {
        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, userId));
        if (merchant == null) {
            throw AppException.notFound("商家信息不存在");
        }
        return merchant;
    }

    private ServiceItem getOwnedService(Long merchantId, Long serviceId) {
        ServiceItem serviceItem = serviceItemMapper.selectById(serviceId);
        if (serviceItem == null) {
            throw AppException.notFound("服务不存在");
        }
        if (!Objects.equals(serviceItem.getMerchantId(), merchantId)) {
            throw AppException.forbidden("无权操作该服务");
        }
        return serviceItem;
    }

    private OrderInfo getOwnedOrder(Long merchantId, Long orderId) {
        OrderInfo orderInfo = orderInfoMapper.selectById(orderId);
        if (orderInfo == null) {
            throw AppException.notFound("订单不存在");
        }
        if (!Objects.equals(orderInfo.getMerchantId(), merchantId)) {
            throw AppException.forbidden("无权操作该订单");
        }
        return orderInfo;
    }

    private StaffMember getOwnedStaff(Long merchantId, Long staffId) {
        StaffMember staffMember = staffMemberMapper.selectById(staffId);
        if (staffMember == null) {
            throw AppException.notFound("员工不存在");
        }
        if (!Objects.equals(staffMember.getMerchantId(), merchantId)) {
            throw AppException.forbidden("无权操作该员工");
        }
        return staffMember;
    }

    private Map<String, Object> buildServiceView(ServiceItem serviceItem) {
        Category category = categoryMapper.selectById(serviceItem.getCategoryId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", serviceItem.getId());
        data.put("merchantId", serviceItem.getMerchantId());
        data.put("categoryId", serviceItem.getCategoryId());
        data.put("categoryName", category == null ? null : category.getName());
        data.put("name", serviceItem.getName());
        data.put("price", serviceItem.getPrice());
        data.put("duration", serviceItem.getDuration());
        data.put("description", serviceItem.getDescription());
        data.put("images", serviceItem.getImages());
        data.put("imageList", splitCsv(serviceItem.getImages()));
        data.put("tags", serviceItem.getTags());
        data.put("tagList", splitCsv(serviceItem.getTags()));
        data.put("sales", serviceItem.getSales());
        data.put("status", serviceItem.getStatus());
        data.put("auditStatus", serviceItem.getAuditStatus());
        data.put("auditRemark", serviceItem.getAuditRemark());
        data.put("createTime", serviceItem.getCreateTime());
        data.put("updateTime", serviceItem.getUpdateTime());
        return data;
    }

    private Map<String, Object> buildOrderView(OrderInfo orderInfo) {
        ServiceItem serviceItem = serviceItemMapper.selectById(orderInfo.getServiceId());
        Category category = serviceItem == null ? null : categoryMapper.selectById(serviceItem.getCategoryId());
        User user = userMapper.selectById(orderInfo.getUserId());
        Merchant merchant = merchantMapper.selectById(orderInfo.getMerchantId());
        StaffMember staffMember = orderInfo.getStaffId() == null ? null : staffMemberMapper.selectById(orderInfo.getStaffId());
        Review review = reviewMapper.selectOne(new LambdaQueryWrapper<Review>()
                .eq(Review::getOrderId, orderInfo.getId())
                .last("limit 1"));
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
        data.put("updateTime", orderInfo.getUpdateTime());
        data.put("userId", orderInfo.getUserId());
        data.put("userName", displayUserName(user));
        data.put("userNickname", user == null ? null : user.getNickname());
        data.put("userPhone", user == null ? null : user.getPhone());
        data.put("merchantId", orderInfo.getMerchantId());
        data.put("merchantName", merchant == null ? null : merchant.getName());
        data.put("merchantPhone", merchant == null ? null : merchant.getPhone());
        if (serviceItem != null) {
            data.put("serviceId", serviceItem.getId());
            data.put("serviceName", serviceItem.getName());
            data.put("servicePrice", serviceItem.getPrice());
            data.put("serviceImage", firstImage(serviceItem.getImages()));
            data.put("serviceImages", splitCsv(serviceItem.getImages()));
            data.put("serviceTags", splitCsv(serviceItem.getTags()));
            data.put("serviceDuration", serviceItem.getDuration());
            data.put("serviceDescription", serviceItem.getDescription());
            data.put("serviceAuditStatus", serviceItem.getAuditStatus());
            data.put("serviceStatus", serviceItem.getStatus());
            data.put("categoryId", serviceItem.getCategoryId());
            data.put("categoryName", category == null ? null : category.getName());
            data.put("service", buildServiceView(serviceItem));
        } else {
            data.put("service", null);
        }
        data.put("merchant", buildMerchantLite(merchant));
        data.put("user", buildUserLite(user));
        data.put("staff", buildStaffLite(staffMember));
        data.put("review", review == null ? null : buildReviewView(review));
        return data;
    }

    private Map<String, Object> buildReviewView(Review review) {
        OrderInfo orderInfo = orderInfoMapper.selectById(review.getOrderId());
        ServiceItem serviceItem = serviceItemMapper.selectById(review.getServiceId());
        Category category = serviceItem == null ? null : categoryMapper.selectById(serviceItem.getCategoryId());
        User user = userMapper.selectById(review.getUserId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", review.getId());
        data.put("orderId", review.getOrderId());
        data.put("orderNo", orderInfo == null ? null : orderInfo.getOrderNo());
        data.put("orderStatus", orderInfo == null ? null : orderInfo.getStatus());
        data.put("appointDate", orderInfo == null ? null : orderInfo.getAppointDate());
        data.put("appointSlot", orderInfo == null ? null : orderInfo.getAppointSlot());
        data.put("merchantId", review.getMerchantId());
        data.put("serviceId", review.getServiceId());
        data.put("serviceName", serviceItem == null ? null : serviceItem.getName());
        data.put("servicePrice", serviceItem == null ? null : serviceItem.getPrice());
        data.put("serviceImage", firstImage(serviceItem == null ? null : serviceItem.getImages()));
        data.put("serviceImages", splitCsv(serviceItem == null ? null : serviceItem.getImages()));
        data.put("categoryName", category == null ? null : category.getName());
        data.put("userId", review.getUserId());
        data.put("userName", displayUserName(user));
        data.put("userNickname", user == null ? null : user.getNickname());
        data.put("userPhone", user == null ? null : user.getPhone());
        data.put("rating", review.getRating());
        data.put("content", review.getContent());
        data.put("images", splitCsv(review.getImages()));
        data.put("reply", review.getReply());
        data.put("replyTime", review.getReplyTime());
        data.put("hasReply", review.getReply() != null && !review.getReply().isBlank());
        data.put("pendingReply", review.getReply() == null || review.getReply().isBlank());
        data.put("createTime", review.getCreateTime());
        data.put("updateTime", review.getUpdateTime());
        data.put("user", buildUserLite(user));
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

    private Map<String, Object> buildUserLite(User user) {
        if (user == null) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("phone", user.getPhone());
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

    private Map<String, Object> buildStaffView(StaffMember staffMember) {
        User user = userMapper.selectById(staffMember.getUserId());
        Map<String, Object> data = buildStaffLite(staffMember);
        data.put("merchantId", staffMember.getMerchantId());
        data.put("statusText", Integer.valueOf(1).equals(staffMember.getStatus()) ? "在职" : "停用");
        data.put("createTime", staffMember.getCreateTime());
        data.put("updateTime", staffMember.getUpdateTime());
        data.put("username", user == null ? null : user.getUsername());
        return data;
    }

    private Long countOrdersByStatus(Long merchantId, String status) {
        return orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getMerchantId, merchantId)
                .eq(OrderInfo::getStatus, status));
    }

    private Integer defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String generateStaffUsername(Long merchantId) {
        long index = staffMemberMapper.selectCount(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchantId)) + 1;
        while (true) {
            String username = "staff" + merchantId + "_" + index;
            Long existed = userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .eq(User::getUsername, username));
            if (existed == null || existed == 0) {
                return username;
            }
            index++;
        }
    }

    private String displayUserName(User user) {
        if (user == null) {
            return null;
        }
        if (user.getNickname() != null && !user.getNickname().isBlank()) {
            return user.getNickname();
        }
        return user.getUsername();
    }

    private String firstImage(String images) {
        List<String> items = splitCsv(images);
        return items.isEmpty() ? null : items.get(0);
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(value.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toList());
    }
}
