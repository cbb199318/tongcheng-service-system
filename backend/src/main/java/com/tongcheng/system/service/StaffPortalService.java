package com.tongcheng.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.StaffDtos;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.StaffMember;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.CategoryMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.StaffMemberMapper;
import com.tongcheng.system.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class StaffPortalService {

    private final StaffMemberMapper staffMemberMapper;
    private final UserMapper userMapper;
    private final MerchantMapper merchantMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final ServiceItemMapper serviceItemMapper;
    private final CategoryMapper categoryMapper;
    private final OrderMessageService orderMessageService;

    public StaffPortalService(StaffMemberMapper staffMemberMapper, UserMapper userMapper, MerchantMapper merchantMapper,
                              OrderInfoMapper orderInfoMapper, ServiceItemMapper serviceItemMapper, CategoryMapper categoryMapper,
                              OrderMessageService orderMessageService) {
        this.staffMemberMapper = staffMemberMapper;
        this.userMapper = userMapper;
        this.merchantMapper = merchantMapper;
        this.orderInfoMapper = orderInfoMapper;
        this.serviceItemMapper = serviceItemMapper;
        this.categoryMapper = categoryMapper;
        this.orderMessageService = orderMessageService;
    }

    public Map<String, Object> getAuthInfo(Long userId) {
        StaffMember staffMember = requireStaffMember(userId);
        User user = requireUser(userId);
        Merchant merchant = requireMerchant(staffMember.getMerchantId());
        Map<String, Object> data = buildProfileView(staffMember, user, merchant);
        data.put("dashboard", getDashboardSummary(userId));
        return data;
    }

    public Map<String, Object> getDashboardSummary(Long userId) {
        StaffMember staffMember = requireStaffMember(userId);
        Merchant merchant = requireMerchant(staffMember.getMerchantId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("staffId", staffMember.getId());
        data.put("staffName", staffMember.getName());
        data.put("merchantId", merchant.getId());
        data.put("merchantName", merchant.getName());
        data.put("pendingServiceCount", countAssignedOrders(staffMember.getId(), "2"));
        data.put("inServiceCount", countAssignedOrders(staffMember.getId(), "3"));
        data.put("completedCount", countAssignedOrders(staffMember.getId(), "4"));
        data.put("cancelledCount", countAssignedOrders(staffMember.getId(), "5"));
        data.put("totalAssignedCount", orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getStaffId, staffMember.getId())));
        return data;
    }

    public PageResult<Map<String, Object>> pageOrders(Long userId, StaffDtos.OrderQuery query) {
        StaffMember staffMember = requireStaffMember(userId);
        LambdaQueryWrapper<OrderInfo> wrapper = new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getStaffId, staffMember.getId())
                .orderByDesc(OrderInfo::getCreateTime);
        if (query.getStatus() != null && !query.getStatus().isBlank()) {
            wrapper.eq(OrderInfo::getStatus, query.getStatus());
        }
        Page<OrderInfo> page = orderInfoMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream()
                .map(this::buildOrderView)
                .collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getOrderDetail(Long userId, Long orderId) {
        StaffMember staffMember = requireStaffMember(userId);
        return buildOrderView(requireAssignedOrder(staffMember, orderId));
    }

    @Transactional
    public void startOrder(Long userId, Long orderId) {
        StaffMember staffMember = requireStaffMember(userId);
        OrderInfo orderInfo = requireAssignedOrder(staffMember, orderId);
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
        StaffMember staffMember = requireStaffMember(userId);
        OrderInfo orderInfo = requireAssignedOrder(staffMember, orderId);
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
        Merchant merchant = requireMerchant(orderInfo.getMerchantId());
        merchant.setOrderCount(defaultZero(merchant.getOrderCount()) + 1);
        merchant.setUpdateTime(LocalDateTime.now());
        merchantMapper.updateById(merchant);
    }

    public Map<String, Object> getProfileDetail(Long userId) {
        StaffMember staffMember = requireStaffMember(userId);
        User user = requireUser(userId);
        Merchant merchant = requireMerchant(staffMember.getMerchantId());
        return buildProfileView(staffMember, user, merchant);
    }

    public List<Map<String, Object>> listOrderMessages(Long userId, Long orderId) {
        return orderMessageService.listForStaff(userId, orderId);
    }

    @Transactional
    public void sendOrderMessage(Long userId, StaffDtos.MessageSendRequest request) {
        orderMessageService.sendForStaff(userId, request.getOrderId(), request.getContent());
    }

    private Map<String, Object> buildProfileView(StaffMember staffMember, User user, Merchant merchant) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("staffId", staffMember.getId());
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("name", staffMember.getName());
        data.put("phone", staffMember.getPhone());
        data.put("specialty", staffMember.getSpecialty());
        data.put("status", staffMember.getStatus());
        data.put("role", user.getRole());
        data.put("merchantId", merchant.getId());
        data.put("merchantName", merchant.getName());
        data.put("merchantPhone", merchant.getPhone());
        data.put("merchantAddress", merchant.getAddress());
        data.put("createTime", staffMember.getCreateTime());
        data.put("updateTime", staffMember.getUpdateTime());
        return data;
    }

    private Map<String, Object> buildOrderView(OrderInfo orderInfo) {
        ServiceItem serviceItem = serviceItemMapper.selectById(orderInfo.getServiceId());
        Category category = serviceItem == null ? null : categoryMapper.selectById(serviceItem.getCategoryId());
        User user = userMapper.selectById(orderInfo.getUserId());
        Merchant merchant = merchantMapper.selectById(orderInfo.getMerchantId());
        StaffMember staffMember = orderInfo.getStaffId() == null ? null : staffMemberMapper.selectById(orderInfo.getStaffId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", orderInfo.getId());
        data.put("orderNo", orderInfo.getOrderNo());
        data.put("status", orderInfo.getStatus());
        data.put("address", orderInfo.getAddress());
        data.put("appointDate", orderInfo.getAppointDate());
        data.put("appointSlot", orderInfo.getAppointSlot());
        data.put("remark", orderInfo.getRemark());
        data.put("totalPrice", orderInfo.getTotalPrice());
        data.put("assignTime", orderInfo.getAssignTime());
        data.put("payTime", orderInfo.getPayTime());
        data.put("acceptTime", orderInfo.getAcceptTime());
        data.put("startTime", orderInfo.getStartTime());
        data.put("completeTime", orderInfo.getCompleteTime());
        data.put("cancelTime", orderInfo.getCancelTime());
        data.put("cancelReason", orderInfo.getCancelReason());
        data.put("createTime", orderInfo.getCreateTime());
        data.put("updateTime", orderInfo.getUpdateTime());
        data.put("userName", displayUserName(user));
        data.put("userPhone", user == null ? null : user.getPhone());
        data.put("merchantName", merchant == null ? null : merchant.getName());
        data.put("merchantPhone", merchant == null ? null : merchant.getPhone());
        data.put("staff", buildStaffLite(staffMember));
        if (serviceItem != null) {
            data.put("serviceId", serviceItem.getId());
            data.put("serviceName", serviceItem.getName());
            data.put("servicePrice", serviceItem.getPrice());
            data.put("serviceImage", firstImage(serviceItem.getImages()));
            data.put("serviceImages", splitCsv(serviceItem.getImages()));
            data.put("serviceTags", splitCsv(serviceItem.getTags()));
            data.put("serviceDuration", serviceItem.getDuration());
            data.put("categoryName", category == null ? null : category.getName());
        }
        return data;
    }

    private Map<String, Object> buildStaffLite(StaffMember staffMember) {
        if (staffMember == null) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", staffMember.getId());
        data.put("name", staffMember.getName());
        data.put("phone", staffMember.getPhone());
        data.put("specialty", staffMember.getSpecialty());
        data.put("status", staffMember.getStatus());
        return data;
    }

    private Long countAssignedOrders(Long staffId, String status) {
        return orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getStaffId, staffId)
                .eq(OrderInfo::getStatus, status));
    }

    private StaffMember requireStaffMember(Long userId) {
        StaffMember staffMember = staffMemberMapper.selectOne(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getUserId, userId)
                .last("limit 1"));
        if (staffMember == null) {
            throw AppException.notFound("服务人员信息不存在");
        }
        return staffMember;
    }

    private OrderInfo requireAssignedOrder(StaffMember staffMember, Long orderId) {
        OrderInfo orderInfo = orderInfoMapper.selectById(orderId);
        if (orderInfo == null) {
            throw AppException.notFound("订单不存在");
        }
        if (!Objects.equals(orderInfo.getMerchantId(), staffMember.getMerchantId())) {
            throw AppException.forbidden("无权访问该订单");
        }
        if (!Objects.equals(orderInfo.getStaffId(), staffMember.getId())) {
            throw AppException.forbidden("仅允许访问分配给自己的订单");
        }
        return orderInfo;
    }

    private User requireUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }
        return user;
    }

    private Merchant requireMerchant(Long merchantId) {
        Merchant merchant = merchantMapper.selectById(merchantId);
        if (merchant == null) {
            throw AppException.notFound("商家不存在");
        }
        return merchant;
    }

    private Integer defaultZero(Integer value) {
        return value == null ? 0 : value;
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
            return List.of();
        }
        return List.of(value.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toList());
    }
}
