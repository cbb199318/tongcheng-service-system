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
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.CategoryMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ReviewMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
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

    public MerchantPortalService(MerchantMapper merchantMapper, ServiceItemMapper serviceItemMapper, CategoryMapper categoryMapper,
                                 OrderInfoMapper orderInfoMapper, ReviewMapper reviewMapper) {
        this.merchantMapper = merchantMapper;
        this.serviceItemMapper = serviceItemMapper;
        this.categoryMapper = categoryMapper;
        this.orderInfoMapper = orderInfoMapper;
        this.reviewMapper = reviewMapper;
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

    public PageResult<ServiceItem> pageServices(Long userId, MerchantDtos.ServiceQuery query) {
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
        return PageResult.of(page);
    }

    @Transactional
    public void saveService(Long userId, MerchantDtos.ServiceSaveRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        Category category = categoryMapper.selectById(request.getCategoryId());
        if (category == null) {
            throw AppException.notFound("分类不存在");
        }
        ServiceItem serviceItem = request.getId() == null ? new ServiceItem() : getOwnedService(merchant.getId(), request.getId());
        serviceItem.setMerchantId(merchant.getId());
        serviceItem.setCategoryId(request.getCategoryId());
        serviceItem.setName(request.getName());
        serviceItem.setPrice(request.getPrice());
        serviceItem.setDuration(request.getDuration());
        serviceItem.setDescription(request.getDescription());
        serviceItem.setImages(request.getImages());
        serviceItem.setTags(request.getTags());
        serviceItem.setStatus(1);
        serviceItem.setAuditStatus("0");
        serviceItem.setAuditRemark("待审核");
        serviceItem.setUpdateTime(LocalDateTime.now());
        if (serviceItem.getId() == null) {
            serviceItem.setSales(0);
            serviceItemMapper.insert(serviceItem);
        } else {
            serviceItemMapper.updateById(serviceItem);
        }
    }

    public ServiceItem getServiceDetail(Long userId, Long serviceId) {
        Merchant merchant = getMerchantByUserId(userId);
        return getOwnedService(merchant.getId(), serviceId);
    }

    @Transactional
    public void deleteService(Long userId, Long serviceId) {
        Merchant merchant = getMerchantByUserId(userId);
        ServiceItem serviceItem = getOwnedService(merchant.getId(), serviceId);
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
        List<Map<String, Object>> records = page.getRecords().stream().map(this::buildOrderView).collect(Collectors.toList());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    public Map<String, Object> getOrderDetail(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), orderId);
        return buildOrderView(orderInfo);
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
    public void rejectOrder(Long userId, MerchantDtos.OrderActionRequest request) {
        Merchant merchant = getMerchantByUserId(userId);
        OrderInfo orderInfo = getOwnedOrder(merchant.getId(), request.getOrderId());
        if (!"1".equals(orderInfo.getStatus())) {
            throw AppException.badRequest("仅待接单订单允许拒单");
        }
        orderInfo.setStatus("5");
        orderInfo.setCancelReason(request.getReason());
        orderInfo.setCancelTime(LocalDateTime.now());
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
            serviceItem.setSales(serviceItem.getSales() + 1);
            serviceItem.setUpdateTime(LocalDateTime.now());
            serviceItemMapper.updateById(serviceItem);
        }
        merchant.setOrderCount(merchant.getOrderCount() + 1);
        merchant.setUpdateTime(LocalDateTime.now());
        merchantMapper.updateById(merchant);
    }

    public PageResult<Map<String, Object>> pageReviews(Long userId, MerchantDtos.ReviewQuery query) {
        Merchant merchant = getMerchantByUserId(userId);
        LambdaQueryWrapper<Review> wrapper = new LambdaQueryWrapper<Review>()
                .eq(Review::getMerchantId, merchant.getId())
                .orderByDesc(Review::getCreateTime);
        if (query.getHasReply() != null) {
            if (query.getHasReply() == 1) {
                wrapper.isNotNull(Review::getReply);
            } else {
                wrapper.and(w -> w.isNull(Review::getReply).or().eq(Review::getReply, ""));
            }
        }
        Page<Review> page = reviewMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Map<String, Object>> records = page.getRecords().stream().map(review -> {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("id", review.getId());
            data.put("orderId", review.getOrderId());
            data.put("rating", review.getRating());
            data.put("content", review.getContent());
            data.put("images", review.getImages() == null ? Collections.emptyList() : List.of(review.getImages().split(",")));
            data.put("reply", review.getReply());
            data.put("replyTime", review.getReplyTime());
            return data;
        }).collect(Collectors.toList());
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
        data.put("message", "人员招募能力已预留，待二期扩展");
        return data;
    }

    public Map<String, Object> communicationPlaceholder(Long userId, Long orderId) {
        Merchant merchant = getMerchantByUserId(userId);
        getOwnedOrder(merchant.getId(), orderId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderId", orderId);
        data.put("status", "reserved");
        data.put("message", "服务沟通能力已预留，待二期扩展");
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

    private Map<String, Object> buildOrderView(OrderInfo orderInfo) {
        ServiceItem serviceItem = serviceItemMapper.selectById(orderInfo.getServiceId());
        Category category = serviceItem == null ? null : categoryMapper.selectById(serviceItem.getCategoryId());
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
        data.put("cancelReason", orderInfo.getCancelReason());
        if (serviceItem != null) {
            data.put("serviceId", serviceItem.getId());
            data.put("serviceName", serviceItem.getName());
            data.put("servicePrice", serviceItem.getPrice());
            data.put("categoryName", category == null ? null : category.getName());
        }
        return data;
    }
}
