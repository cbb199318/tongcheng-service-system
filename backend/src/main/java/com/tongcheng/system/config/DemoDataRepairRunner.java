package com.tongcheng.system.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.Review;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.StaffMember;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ReviewMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.StaffMemberMapper;
import com.tongcheng.system.mapper.UserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class DemoDataRepairRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataRepairRunner.class);
    private static final String DEMO_USERNAME = "user01";
    private static final String DEMO_MERCHANT_USERNAME = "merchant01";
    private static final String DEMO_ORDER_USER_USERNAME = "user02";
    private static final String DEMO_ORDER_REMARK = "演示数据自动补齐，可直接用于用户端评价链路复测";
    private static final String DEMO_ORDER_ADDRESS = "济南市历下区演示社区 88 号 2 单元 601";
    private static final String DEMO_ORDER_SLOT = "上午 (08:00-12:00)";
    private static final String DEMO_PASSWORD_HASH = "$2b$12$DDD/5H39EDIukFAmiYzrpunKVFL/YARwnEMncDzaiXOENf7ostUfG";

    private static final String MERCHANT_DEMO_PENDING_SERVICE = "商家端演示待审核服务";
    private static final String MERCHANT_DEMO_APPROVED_SERVICE = "商家端演示标准服务";
    private static final String MERCHANT_PENDING_ORDER_NO = "DEMO-M01-PENDING-001";
    private static final String MERCHANT_REJECT_ORDER_NO = "DEMO-M01-REJECT-001";
    private static final String MERCHANT_ACCEPTED_ORDER_NO = "DEMO-M01-ACCEPTED-001";
    private static final String MERCHANT_REVIEW_ORDER_NO = "DEMO-M01-REVIEW-001";
    private static final String DEMO_STAFF_USERNAME = "staff1_1";

    private final UserMapper userMapper;
    private final ServiceItemMapper serviceItemMapper;
    private final MerchantMapper merchantMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final ReviewMapper reviewMapper;
    private final StaffMemberMapper staffMemberMapper;
    private final PasswordEncoder passwordEncoder;

    public DemoDataRepairRunner(UserMapper userMapper, ServiceItemMapper serviceItemMapper, MerchantMapper merchantMapper,
                                OrderInfoMapper orderInfoMapper, ReviewMapper reviewMapper,
                                StaffMemberMapper staffMemberMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.serviceItemMapper = serviceItemMapper;
        this.merchantMapper = merchantMapper;
        this.orderInfoMapper = orderInfoMapper;
        this.reviewMapper = reviewMapper;
        this.staffMemberMapper = staffMemberMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureUser01HasPendingReviewOrder();
        ensureMerchant01DemoData();
        ensureAdminAuditDemoData();
    }

    @Transactional
    public void ensureUser01HasPendingReviewOrder() {
        User user = findUserByUsername(DEMO_USERNAME);
        if (user == null) {
            log.warn("Skip demo order repair because user {} is missing", DEMO_USERNAME);
            return;
        }

        List<OrderInfo> reviewableOrders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, user.getId())
                .eq(OrderInfo::getStatus, "4")
                .eq(OrderInfo::getIsCommented, 0)
                .orderByDesc(OrderInfo::getCreateTime));
        for (OrderInfo order : reviewableOrders) {
            Long reviewCount = reviewMapper.selectCount(new LambdaQueryWrapper<Review>()
                    .eq(Review::getOrderId, order.getId()));
            if (reviewCount != null && reviewCount == 0) {
                return;
            }
        }

        ServiceItem serviceItem = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getStatus, 1)
                .eq(ServiceItem::getAuditStatus, "2")
                .orderByAsc(ServiceItem::getId)
                .last("limit 1"));
        if (serviceItem == null) {
            log.warn("Skip demo order repair because no approved service is available");
            return;
        }

        Merchant merchant = merchantMapper.selectById(serviceItem.getMerchantId());
        if (merchant == null) {
            log.warn("Skip demo order repair because merchant {} is missing", serviceItem.getMerchantId());
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime payTime = now.minusDays(2);
        LocalDateTime acceptTime = payTime.plusMinutes(30);
        LocalDateTime startTime = now.minusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime completeTime = startTime.plusHours(3);

        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setOrderNo("DEMO" + DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS").format(now));
        orderInfo.setUserId(user.getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(serviceItem.getId());
        orderInfo.setStatus("4");
        orderInfo.setAddress(DEMO_ORDER_ADDRESS);
        orderInfo.setAppointDate(LocalDate.now().minusDays(1));
        orderInfo.setAppointSlot(DEMO_ORDER_SLOT);
        orderInfo.setRemark(DEMO_ORDER_REMARK);
        orderInfo.setTotalPrice(defaultPrice(serviceItem));
        orderInfo.setPayTime(payTime);
        orderInfo.setAcceptTime(acceptTime);
        orderInfo.setStartTime(startTime);
        orderInfo.setCompleteTime(completeTime);
        orderInfo.setIsCommented(0);
        orderInfo.setCreateTime(payTime.minusMinutes(15));
        orderInfo.setUpdateTime(now);
        orderInfoMapper.insert(orderInfo);

        log.info("Inserted demo reviewable order {} for user {}", orderInfo.getOrderNo(), DEMO_USERNAME);
    }

    @Transactional
    public void ensureMerchant01DemoData() {
        User merchantUser = findUserByUsername(DEMO_MERCHANT_USERNAME);
        User orderUser = findUserByUsername(DEMO_ORDER_USER_USERNAME);
        if (merchantUser == null || orderUser == null) {
            log.warn("Skip merchant demo repair because merchant user or order user is missing");
            return;
        }

        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, merchantUser.getId())
                .last("limit 1"));
        if (merchant == null) {
            log.warn("Skip merchant demo repair because merchant profile for {} is missing", DEMO_MERCHANT_USERNAME);
            return;
        }

        ensureMerchantPendingService(merchant);
        ServiceItem approvedService = ensureMerchantApprovedService(merchant);
        ensureMerchantPendingOrder(merchant, orderUser, approvedService, MERCHANT_PENDING_ORDER_NO,
                "商家端演示待接单订单", "济南市市中区演示街道 18 号", LocalDate.now().plusDays(1), DEMO_ORDER_SLOT,
                LocalDateTime.now().minusHours(3), LocalDateTime.now().minusHours(2));
        ensureMerchantPendingOrder(merchant, orderUser, approvedService, MERCHANT_REJECT_ORDER_NO,
                "商家端演示拒单订单", "济南市天桥区演示广场 9 号楼", LocalDate.now().plusDays(2), "下午 (14:00-18:00)",
                LocalDateTime.now().minusHours(4), LocalDateTime.now().minusHours(3));
        ensureMerchantAcceptedOrInServiceOrder(merchant, orderUser, approvedService);
        ensureMerchantPendingReplyReview(merchant, orderUser, approvedService);
        ensureMerchantDemoStaff(merchant);
    }

    @Transactional
    public void ensureAdminAuditDemoData() {
        ensurePendingAuditMerchant("merchant03", "优选到家", "13800000006",
                "济南市槐荫区经七路 66 号", "申请入驻中的综合生活服务商家，用于后台待审核演示。",
                "/upload/demo/merchant-1-logo.svg", "/upload/demo/merchant-1-license.svg");
        ensureRejectedAuditMerchant("merchant04", "闪修生活", "13800000007",
                "济南市高新区工业南路 99 号", "曾提交资料但被驳回的演示商家，用于后台已驳回场景。",
                "/upload/demo/merchant-2-logo.svg", "/upload/demo/merchant-2-license.svg");
    }

    private void ensurePendingAuditMerchant(String username, String merchantName, String phone, String address,
                                           String intro, String logo, String license) {
        User user = ensureDemoUser(username, merchantName, phone);
        user.setRole("user");
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);

        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, user.getId())
                .last("limit 1"));
        if (merchant == null) {
            merchant = new Merchant();
            merchant.setUserId(user.getId());
            merchant.setCreateTime(LocalDateTime.now());
            merchant.setStatus(1);
            merchant.setRating(BigDecimal.ZERO);
            merchant.setOrderCount(0);
        }
        merchant.setName(merchantName);
        merchant.setPhone(phone);
        merchant.setAddress(address);
        merchant.setIntro(intro);
        merchant.setLogo(logo);
        merchant.setLicense(license);
        merchant.setAuditStatus("0");
        merchant.setAuditRemark("待审核");
        merchant.setUpdateTime(LocalDateTime.now());
        saveMerchant(merchant);
    }

    private void ensureRejectedAuditMerchant(String username, String merchantName, String phone, String address,
                                            String intro, String logo, String license) {
        User user = ensureDemoUser(username, merchantName, phone);
        user.setRole("user");
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);

        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, user.getId())
                .last("limit 1"));
        if (merchant == null) {
            merchant = new Merchant();
            merchant.setUserId(user.getId());
            merchant.setCreateTime(LocalDateTime.now());
            merchant.setStatus(1);
            merchant.setRating(BigDecimal.ZERO);
            merchant.setOrderCount(0);
        }
        merchant.setName(merchantName);
        merchant.setPhone(phone);
        merchant.setAddress(address);
        merchant.setIntro(intro);
        merchant.setLogo(logo);
        merchant.setLicense(license);
        merchant.setAuditStatus("1");
        merchant.setAuditRemark("资质照片不清晰，请重新上传营业资质。");
        merchant.setUpdateTime(LocalDateTime.now());
        saveMerchant(merchant);
    }

    private void ensureMerchantPendingService(Merchant merchant) {
        ServiceItem existing = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant.getId())
                .eq(ServiceItem::getAuditStatus, "0")
                .orderByAsc(ServiceItem::getId)
                .last("limit 1"));
        if (existing != null) {
            return;
        }

        ServiceItem serviceItem = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant.getId())
                .eq(ServiceItem::getName, MERCHANT_DEMO_PENDING_SERVICE)
                .last("limit 1"));
        if (serviceItem == null) {
            serviceItem = new ServiceItem();
            serviceItem.setMerchantId(merchant.getId());
            serviceItem.setCategoryId(2L);
            serviceItem.setName(MERCHANT_DEMO_PENDING_SERVICE);
            serviceItem.setCreateTime(LocalDateTime.now());
            serviceItem.setSales(0);
        }
        serviceItem.setPrice(BigDecimal.valueOf(168));
        serviceItem.setDuration(120);
        serviceItem.setDescription("用于商家端论文演示的待审核服务项目。");
        serviceItem.setImages("/upload/demo/service-1.svg");
        serviceItem.setTags("保洁,演示");
        serviceItem.setStatus(1);
        serviceItem.setAuditStatus("0");
        serviceItem.setAuditRemark("待审核");
        serviceItem.setUpdateTime(LocalDateTime.now());
        saveServiceItem(serviceItem);
    }

    private ServiceItem ensureMerchantApprovedService(Merchant merchant) {
        ServiceItem approvedService = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant.getId())
                .eq(ServiceItem::getStatus, 1)
                .eq(ServiceItem::getAuditStatus, "2")
                .orderByAsc(ServiceItem::getId)
                .last("limit 1"));
        if (approvedService != null) {
            return approvedService;
        }

        ServiceItem serviceItem = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant.getId())
                .eq(ServiceItem::getName, MERCHANT_DEMO_APPROVED_SERVICE)
                .last("limit 1"));
        if (serviceItem == null) {
            serviceItem = new ServiceItem();
            serviceItem.setMerchantId(merchant.getId());
            serviceItem.setCategoryId(2L);
            serviceItem.setName(MERCHANT_DEMO_APPROVED_SERVICE);
            serviceItem.setCreateTime(LocalDateTime.now());
            serviceItem.setSales(0);
        }
        serviceItem.setPrice(BigDecimal.valueOf(199));
        serviceItem.setDuration(180);
        serviceItem.setDescription("用于商家端论文演示的标准上架服务项目。");
        serviceItem.setImages("/upload/demo/service-2.svg");
        serviceItem.setTags("保洁,标准");
        serviceItem.setStatus(1);
        serviceItem.setAuditStatus("2");
        serviceItem.setAuditRemark("审核通过");
        serviceItem.setUpdateTime(LocalDateTime.now());
        saveServiceItem(serviceItem);
        return serviceItem;
    }

    private void ensureMerchantPendingOrder(Merchant merchant, User orderUser, ServiceItem serviceItem, String orderNo,
                                            String remark, String address, LocalDate appointDate, String appointSlot,
                                            LocalDateTime createTime, LocalDateTime payTime) {
        OrderInfo orderInfo = findOrderByNo(orderNo);
        if (orderInfo == null) {
            orderInfo = new OrderInfo();
            orderInfo.setOrderNo(orderNo);
            orderInfo.setCreateTime(createTime);
        }
        orderInfo.setUserId(orderUser.getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(serviceItem.getId());
        orderInfo.setStatus("1");
        orderInfo.setAddress(address);
        orderInfo.setAppointDate(appointDate);
        orderInfo.setAppointSlot(appointSlot);
        orderInfo.setRemark(remark);
        orderInfo.setTotalPrice(defaultPrice(serviceItem));
        orderInfo.setPayTime(payTime);
        orderInfo.setAcceptTime(null);
        orderInfo.setStartTime(null);
        orderInfo.setCompleteTime(null);
        orderInfo.setCancelTime(null);
        orderInfo.setCancelReason(null);
        orderInfo.setIsCommented(0);
        orderInfo.setUpdateTime(LocalDateTime.now());
        saveOrderInfo(orderInfo);
    }

    private void ensureMerchantAcceptedOrInServiceOrder(Merchant merchant, User orderUser, ServiceItem serviceItem) {
        OrderInfo existing = orderInfoMapper.selectOne(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getMerchantId, merchant.getId())
                .in(OrderInfo::getStatus, List.of("2", "3"))
                .orderByDesc(OrderInfo::getCreateTime)
                .last("limit 1"));
        if (existing != null) {
            return;
        }

        OrderInfo orderInfo = findOrderByNo(MERCHANT_ACCEPTED_ORDER_NO);
        if (orderInfo == null) {
            orderInfo = new OrderInfo();
            orderInfo.setOrderNo(MERCHANT_ACCEPTED_ORDER_NO);
            orderInfo.setCreateTime(LocalDateTime.now().minusHours(7));
        }
        LocalDateTime now = LocalDateTime.now();
        orderInfo.setUserId(orderUser.getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(serviceItem.getId());
        orderInfo.setStatus("2");
        orderInfo.setAddress("济南市槐荫区演示路 28 号");
        orderInfo.setAppointDate(LocalDate.now());
        orderInfo.setAppointSlot("下午 (14:00-18:00)");
        orderInfo.setRemark("商家端演示已接单订单");
        orderInfo.setTotalPrice(defaultPrice(serviceItem));
        orderInfo.setPayTime(now.minusHours(6));
        orderInfo.setAcceptTime(now.minusHours(5));
        orderInfo.setStartTime(null);
        orderInfo.setCompleteTime(null);
        orderInfo.setCancelTime(null);
        orderInfo.setCancelReason(null);
        orderInfo.setIsCommented(0);
        orderInfo.setUpdateTime(now.minusHours(5));
        saveOrderInfo(orderInfo);
    }

    private void ensureMerchantDemoStaff(Merchant merchant) {
        User staffUser = findUserByUsername(DEMO_STAFF_USERNAME);
        if (staffUser == null) {
            staffUser = new User();
            staffUser.setUsername(DEMO_STAFF_USERNAME);
            staffUser.setPassword(passwordEncoder.encode("123456"));
            staffUser.setNickname("李师傅");
            staffUser.setPhone("13800000018");
            staffUser.setRole("staff");
            staffUser.setStatus(1);
            staffUser.setPoints(0);
            staffUser.setCreateTime(LocalDateTime.now());
            staffUser.setUpdateTime(LocalDateTime.now());
            userMapper.insert(staffUser);
        } else {
            staffUser.setRole("staff");
            staffUser.setStatus(1);
            staffUser.setNickname("李师傅");
            staffUser.setPhone("13800000018");
            if (staffUser.getPassword() == null || staffUser.getPassword().isBlank()) {
                staffUser.setPassword(passwordEncoder.encode("123456"));
            }
            staffUser.setUpdateTime(LocalDateTime.now());
            userMapper.updateById(staffUser);
        }

        StaffMember staffMember = staffMemberMapper.selectOne(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getUserId, staffUser.getId())
                .last("limit 1"));
        if (staffMember == null) {
            staffMember = new StaffMember();
            staffMember.setUserId(staffUser.getId());
            staffMember.setCreateTime(LocalDateTime.now());
        }
        staffMember.setMerchantId(merchant.getId());
        staffMember.setName("李师傅");
        staffMember.setPhone("13800000018");
        staffMember.setSpecialty("深度保洁,家电清洗");
        staffMember.setStatus(1);
        staffMember.setUpdateTime(LocalDateTime.now());
        saveStaffMember(staffMember);

        OrderInfo assignedOrder = findOrderByNo(MERCHANT_ACCEPTED_ORDER_NO);
        if (assignedOrder != null) {
            assignedOrder.setStaffId(staffMember.getId());
            assignedOrder.setAssignTime(LocalDateTime.now().minusHours(4));
            assignedOrder.setUpdateTime(LocalDateTime.now().minusHours(4));
            saveOrderInfo(assignedOrder);
        }
    }

    private void ensureMerchantPendingReplyReview(Merchant merchant, User orderUser, ServiceItem serviceItem) {
        OrderInfo orderInfo = findOrderByNo(MERCHANT_REVIEW_ORDER_NO);
        if (orderInfo == null) {
            orderInfo = new OrderInfo();
            orderInfo.setOrderNo(MERCHANT_REVIEW_ORDER_NO);
            orderInfo.setCreateTime(LocalDateTime.now().minusDays(3).minusMinutes(30));
        }
        LocalDateTime now = LocalDateTime.now();
        orderInfo.setUserId(orderUser.getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(serviceItem.getId());
        orderInfo.setStatus("4");
        orderInfo.setAddress("济南市历城区演示花园 6 号楼");
        orderInfo.setAppointDate(LocalDate.now().minusDays(2));
        orderInfo.setAppointSlot(DEMO_ORDER_SLOT);
        orderInfo.setRemark("商家端演示待回复评价订单");
        orderInfo.setTotalPrice(defaultPrice(serviceItem));
        orderInfo.setPayTime(now.minusDays(3));
        orderInfo.setAcceptTime(now.minusDays(3).plusHours(1));
        orderInfo.setStartTime(now.minusDays(2).withHour(9).withMinute(0).withSecond(0).withNano(0));
        orderInfo.setCompleteTime(now.minusDays(2).withHour(12).withMinute(0).withSecond(0).withNano(0));
        orderInfo.setCancelTime(null);
        orderInfo.setCancelReason(null);
        orderInfo.setIsCommented(1);
        orderInfo.setUpdateTime(now.minusDays(2));
        saveOrderInfo(orderInfo);

        Review review = reviewMapper.selectOne(new LambdaQueryWrapper<Review>()
                .eq(Review::getOrderId, orderInfo.getId())
                .last("limit 1"));
        if (review == null) {
            review = new Review();
            review.setOrderId(orderInfo.getId());
            review.setUserId(orderUser.getId());
            review.setMerchantId(merchant.getId());
            review.setServiceId(serviceItem.getId());
            review.setCreateTime(now.minusDays(1));
        }
        review.setRating(5);
        review.setContent("服务到位，方便演示商家端回复评价流程。");
        review.setImages("/upload/demo/service-1.svg");
        review.setReply("");
        review.setReplyTime(null);
        review.setUpdateTime(now.minusDays(1));
        saveReview(review);
    }

    private User ensureDemoUser(String username, String nickname, String phone) {
        User user = findUserByUsername(username);
        if (user == null) {
            user = new User();
            user.setUsername(username);
            user.setPassword(DEMO_PASSWORD_HASH);
            user.setCreateTime(LocalDateTime.now());
            user.setStatus(1);
            user.setPoints(0);
        }
        user.setNickname(nickname);
        user.setPhone(phone);
        user.setRole("user");
        user.setStatus(1);
        user.setPoints(user.getPoints() == null ? 0 : user.getPoints());
        user.setUpdateTime(LocalDateTime.now());
        if (user.getId() == null) {
            userMapper.insert(user);
            return user;
        }
        userMapper.updateById(user);
        return user;
    }

    private User findUserByUsername(String username) {
        return userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username)
                .last("limit 1"));
    }

    private OrderInfo findOrderByNo(String orderNo) {
        return orderInfoMapper.selectOne(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getOrderNo, orderNo)
                .last("limit 1"));
    }

    private BigDecimal defaultPrice(ServiceItem serviceItem) {
        return serviceItem.getPrice() == null ? BigDecimal.ZERO : serviceItem.getPrice();
    }

    private void saveServiceItem(ServiceItem serviceItem) {
        if (serviceItem.getId() == null) {
            serviceItemMapper.insert(serviceItem);
            return;
        }
        serviceItemMapper.updateById(serviceItem);
    }

    private void saveOrderInfo(OrderInfo orderInfo) {
        if (orderInfo.getId() == null) {
            orderInfoMapper.insert(orderInfo);
            return;
        }
        orderInfoMapper.updateById(orderInfo);
    }

    private void saveReview(Review review) {
        if (review.getId() == null) {
            reviewMapper.insert(review);
            return;
        }
        reviewMapper.updateById(review);
    }

    private void saveMerchant(Merchant merchant) {
        if (merchant.getId() == null) {
            merchantMapper.insert(merchant);
            return;
        }
        merchantMapper.updateById(merchant);
    }

    private void saveStaffMember(StaffMember staffMember) {
        if (staffMember.getId() == null) {
            staffMemberMapper.insert(staffMember);
            return;
        }
        staffMemberMapper.updateById(staffMember);
    }
}
