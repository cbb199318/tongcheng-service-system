package com.tongcheng.system;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.MerchantDtos;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.UserMapper;
import com.tongcheng.system.service.MerchantPortalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:merchant-portal-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Transactional
class MerchantPortalServiceTests {

    @Autowired
    private MerchantPortalService merchantPortalService;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private MerchantMapper merchantMapper;

    @Autowired
    private ServiceItemMapper serviceItemMapper;

    @Autowired
    private OrderInfoMapper orderInfoMapper;

    @Test
    void shouldExposeEnhancedDashboardServiceOrderAndReviewViews() {
        User merchantUser = merchantUser();

        Map<String, Object> summary = merchantPortalService.getDashboardSummary(merchantUser.getId());
        assertThat(summary)
                .containsKeys("merchantId", "merchantName", "pendingAuditServiceCount", "pendingOrderCount",
                        "acceptedOrderCount", "inServiceOrderCount", "pendingReplyReviewCount");
        assertThat(((Number) summary.get("pendingAuditServiceCount")).longValue()).isGreaterThanOrEqualTo(1L);
        assertThat(((Number) summary.get("pendingOrderCount")).longValue()).isGreaterThanOrEqualTo(1L);
        assertThat(((Number) summary.get("acceptedOrderCount")).longValue()
                + ((Number) summary.get("inServiceOrderCount")).longValue()).isGreaterThanOrEqualTo(1L);
        assertThat(((Number) summary.get("pendingReplyReviewCount")).longValue()).isGreaterThanOrEqualTo(1L);

        PageResult<Map<String, Object>> servicePage = merchantPortalService.pageServices(merchantUser.getId(), new MerchantDtos.ServiceQuery());
        assertThat(servicePage.getList()).isNotEmpty();
        assertThat(servicePage.getList().get(0))
                .containsKeys("categoryName", "imageList", "tagList", "auditRemark");

        PageResult<Map<String, Object>> orderPage = merchantPortalService.pageOrders(merchantUser.getId(), new MerchantDtos.OrderQuery());
        assertThat(orderPage.getList()).isNotEmpty();
        assertThat(orderPage.getList().get(0))
                .containsKeys("user", "merchant", "service", "userName", "merchantName", "serviceImages", "createTime");

        PageResult<Map<String, Object>> reviewPage = merchantPortalService.pageReviews(merchantUser.getId(), new MerchantDtos.ReviewQuery());
        assertThat(reviewPage.getList()).isNotEmpty();
        assertThat(reviewPage.getList().get(0))
                .containsKeys("orderNo", "serviceName", "serviceImages", "userName", "pendingReply", "user");
    }

    @Test
    void shouldPreserveServiceStatusResetAuditAndBlockDeleteWhenReferenced() {
        User merchantUser = merchantUser();
        Merchant merchant = merchant();

        ServiceItem serviceItem = new ServiceItem();
        serviceItem.setMerchantId(merchant.getId());
        serviceItem.setCategoryId(2L);
        serviceItem.setName("测试服务-保留状态");
        serviceItem.setPrice(BigDecimal.valueOf(88));
        serviceItem.setDuration(60);
        serviceItem.setDescription("用于验证编辑服务规则");
        serviceItem.setImages("/upload/demo/service-1.svg");
        serviceItem.setTags("测试,状态");
        serviceItem.setSales(0);
        serviceItem.setStatus(0);
        serviceItem.setAuditStatus("2");
        serviceItem.setAuditRemark("审核通过");
        serviceItem.setCreateTime(LocalDateTime.now());
        serviceItem.setUpdateTime(LocalDateTime.now());
        serviceItemMapper.insert(serviceItem);

        MerchantDtos.ServiceSaveRequest request = new MerchantDtos.ServiceSaveRequest();
        request.setId(serviceItem.getId());
        request.setCategoryId(2L);
        request.setName("测试服务-已编辑");
        request.setPrice(BigDecimal.valueOf(108));
        request.setDuration(90);
        request.setDescription("编辑后应保留上下架状态");
        request.setImages("/upload/demo/service-2.svg");
        request.setTags("测试,编辑");
        merchantPortalService.saveService(merchantUser.getId(), request);

        ServiceItem updated = serviceItemMapper.selectById(serviceItem.getId());
        assertThat(updated.getStatus()).isEqualTo(0);
        assertThat(updated.getAuditStatus()).isEqualTo("0");
        assertThat(updated.getName()).isEqualTo("测试服务-已编辑");

        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setOrderNo("TEST-DELETE-" + System.currentTimeMillis());
        orderInfo.setUserId(normalUser().getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(serviceItem.getId());
        orderInfo.setStatus("1");
        orderInfo.setAddress("测试地址");
        orderInfo.setAppointDate(LocalDate.now().plusDays(1));
        orderInfo.setAppointSlot("上午 (08:00-12:00)");
        orderInfo.setRemark("测试服务删除拦截");
        orderInfo.setTotalPrice(updated.getPrice());
        orderInfo.setPayTime(LocalDateTime.now());
        orderInfo.setIsCommented(0);
        orderInfo.setCreateTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.insert(orderInfo);

        assertThatThrownBy(() -> merchantPortalService.deleteService(merchantUser.getId(), serviceItem.getId()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("关联订单");
    }

    @Test
    void shouldRequireRejectReasonAtServiceLayer() {
        User merchantUser = merchantUser();
        Merchant merchant = merchant();
        ServiceItem approvedService = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant.getId())
                .eq(ServiceItem::getStatus, 1)
                .eq(ServiceItem::getAuditStatus, "2")
                .orderByAsc(ServiceItem::getId)
                .last("limit 1"));
        assertThat(approvedService).isNotNull();

        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setOrderNo("TEST-REJECT-" + System.currentTimeMillis());
        orderInfo.setUserId(normalUser().getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(approvedService.getId());
        orderInfo.setStatus("1");
        orderInfo.setAddress("测试地址");
        orderInfo.setAppointDate(LocalDate.now().plusDays(1));
        orderInfo.setAppointSlot("上午 (08:00-12:00)");
        orderInfo.setRemark("测试拒单原因校验");
        orderInfo.setTotalPrice(approvedService.getPrice());
        orderInfo.setPayTime(LocalDateTime.now());
        orderInfo.setIsCommented(0);
        orderInfo.setCreateTime(LocalDateTime.now());
        orderInfo.setUpdateTime(LocalDateTime.now());
        orderInfoMapper.insert(orderInfo);

        MerchantDtos.OrderRejectRequest request = new MerchantDtos.OrderRejectRequest();
        request.setOrderId(orderInfo.getId());
        request.setReason("   ");

        assertThatThrownBy(() -> merchantPortalService.rejectOrder(merchantUser.getId(), request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("拒单原因不能为空");
    }

    private User merchantUser() {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, "merchant01")
                .last("limit 1"));
        assertThat(user).isNotNull();
        return user;
    }

    private Merchant merchant() {
        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, merchantUser().getId())
                .last("limit 1"));
        assertThat(merchant).isNotNull();
        return merchant;
    }

    private User normalUser() {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, "user02")
                .last("limit 1"));
        assertThat(user).isNotNull();
        return user;
    }
}
