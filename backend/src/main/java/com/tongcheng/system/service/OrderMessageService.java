package com.tongcheng.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.OrderMessage;
import com.tongcheng.system.entity.StaffMember;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.OrderMessageMapper;
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
public class OrderMessageService {

    private final OrderInfoMapper orderInfoMapper;
    private final OrderMessageMapper orderMessageMapper;
    private final UserMapper userMapper;
    private final MerchantMapper merchantMapper;
    private final StaffMemberMapper staffMemberMapper;

    public OrderMessageService(OrderInfoMapper orderInfoMapper, OrderMessageMapper orderMessageMapper, UserMapper userMapper,
                               MerchantMapper merchantMapper, StaffMemberMapper staffMemberMapper) {
        this.orderInfoMapper = orderInfoMapper;
        this.orderMessageMapper = orderMessageMapper;
        this.userMapper = userMapper;
        this.merchantMapper = merchantMapper;
        this.staffMemberMapper = staffMemberMapper;
    }

    public List<Map<String, Object>> listForUser(Long userId, Long orderId) {
        OrderInfo orderInfo = getOrder(orderId);
        if (!Objects.equals(orderInfo.getUserId(), userId)) {
            throw AppException.forbidden("无权查看该订单沟通记录");
        }
        return loadMessages(orderId);
    }

    public List<Map<String, Object>> listForMerchant(Long merchantUserId, Long orderId) {
        Merchant merchant = getMerchantByUserId(merchantUserId);
        OrderInfo orderInfo = getOrder(orderId);
        if (!Objects.equals(orderInfo.getMerchantId(), merchant.getId())) {
            throw AppException.forbidden("无权查看该订单沟通记录");
        }
        return loadMessages(orderId);
    }

    public List<Map<String, Object>> listForStaff(Long staffUserId, Long orderId) {
        StaffMember staffMember = getStaffByUserId(staffUserId);
        requireAssignedOrder(staffMember, orderId);
        return loadMessages(orderId);
    }

    @Transactional
    public void sendForUser(Long userId, Long orderId, String content) {
        OrderInfo orderInfo = getOrder(orderId);
        if (!Objects.equals(orderInfo.getUserId(), userId)) {
            throw AppException.forbidden("无权发送该订单消息");
        }
        saveMessage(orderId, "user", userId, content);
    }

    @Transactional
    public void sendForMerchant(Long merchantUserId, Long orderId, String content) {
        Merchant merchant = getMerchantByUserId(merchantUserId);
        OrderInfo orderInfo = getOrder(orderId);
        if (!Objects.equals(orderInfo.getMerchantId(), merchant.getId())) {
            throw AppException.forbidden("无权发送该订单消息");
        }
        saveMessage(orderId, "merchant", merchantUserId, content);
    }

    @Transactional
    public void sendForStaff(Long staffUserId, Long orderId, String content) {
        StaffMember staffMember = getStaffByUserId(staffUserId);
        requireAssignedOrder(staffMember, orderId);
        saveMessage(orderId, "staff", staffUserId, content);
    }

    public StaffMember getStaffByUserId(Long userId) {
        StaffMember staffMember = staffMemberMapper.selectOne(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getUserId, userId)
                .last("limit 1"));
        if (staffMember == null) {
            throw AppException.notFound("服务人员信息不存在");
        }
        return staffMember;
    }

    private List<Map<String, Object>> loadMessages(Long orderId) {
        return orderMessageMapper.selectList(new LambdaQueryWrapper<OrderMessage>()
                        .eq(OrderMessage::getOrderId, orderId)
                        .orderByAsc(OrderMessage::getCreateTime)
                        .orderByAsc(OrderMessage::getId))
                .stream()
                .map(this::buildMessageView)
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildMessageView(OrderMessage message) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", message.getId());
        data.put("orderId", message.getOrderId());
        data.put("senderRole", message.getSenderRole());
        data.put("senderUserId", message.getSenderUserId());
        data.put("senderName", resolveSenderName(message));
        data.put("content", message.getContent());
        data.put("createTime", message.getCreateTime());
        return data;
    }

    private String resolveSenderName(OrderMessage message) {
        if ("merchant".equals(message.getSenderRole())) {
            Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                    .eq(Merchant::getUserId, message.getSenderUserId())
                    .last("limit 1"));
            if (merchant != null && merchant.getName() != null && !merchant.getName().isBlank()) {
                return merchant.getName();
            }
        }
        if ("staff".equals(message.getSenderRole())) {
            StaffMember staffMember = staffMemberMapper.selectOne(new LambdaQueryWrapper<StaffMember>()
                    .eq(StaffMember::getUserId, message.getSenderUserId())
                    .last("limit 1"));
            if (staffMember != null && staffMember.getName() != null && !staffMember.getName().isBlank()) {
                return staffMember.getName();
            }
        }
        User user = userMapper.selectById(message.getSenderUserId());
        if (user == null) {
            return "未知用户";
        }
        if (user.getNickname() != null && !user.getNickname().isBlank()) {
            return user.getNickname();
        }
        return user.getUsername();
    }

    private void saveMessage(Long orderId, String senderRole, Long senderUserId, String content) {
        if (content == null || content.trim().isEmpty()) {
            throw AppException.badRequest("消息内容不能为空");
        }
        OrderMessage message = new OrderMessage();
        message.setOrderId(orderId);
        message.setSenderRole(senderRole);
        message.setSenderUserId(senderUserId);
        message.setContent(content.trim());
        message.setCreateTime(LocalDateTime.now());
        orderMessageMapper.insert(message);
    }

    private Merchant getMerchantByUserId(Long userId) {
        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, userId)
                .last("limit 1"));
        if (merchant == null) {
            throw AppException.notFound("商家信息不存在");
        }
        return merchant;
    }

    private void requireAssignedOrder(StaffMember staffMember, Long orderId) {
        OrderInfo orderInfo = getOrder(orderId);
        if (!Objects.equals(orderInfo.getMerchantId(), staffMember.getMerchantId())) {
            throw AppException.forbidden("无权访问该订单");
        }
        if (!Objects.equals(orderInfo.getStaffId(), staffMember.getId())) {
            throw AppException.forbidden("仅允许访问分配给自己的订单");
        }
    }

    private OrderInfo getOrder(Long orderId) {
        OrderInfo orderInfo = orderInfoMapper.selectById(orderId);
        if (orderInfo == null) {
            throw AppException.notFound("订单不存在");
        }
        return orderInfo;
    }
}
