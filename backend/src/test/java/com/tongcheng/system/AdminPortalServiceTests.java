package com.tongcheng.system;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.AdminDtos;
import com.tongcheng.system.entity.Category;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.CategoryMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.UserMapper;
import com.tongcheng.system.service.AdminPortalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-portal-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Transactional
class AdminPortalServiceTests {

    @Autowired
    private AdminPortalService adminPortalService;

    @Autowired
    private OrderInfoMapper orderInfoMapper;

    @Autowired
    private MerchantMapper merchantMapper;

    @Autowired
    private ServiceItemMapper serviceItemMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Test
    void shouldFilterOrdersByDateInDatabaseAndReturnAccurateTotal() {
        Merchant merchant = merchant();
        User user = normalUser();
        ServiceItem serviceItem = approvedService(merchant.getId());

        String withinOrderNo = "ADMIN-DATE-IN-" + System.currentTimeMillis();
        OrderInfo withinRange = insertOrder(withinOrderNo, user.getId(), merchant.getId(),
                serviceItem.getId(), "2", LocalDateTime.now().minusDays(1));

        AdminDtos.OrderQuery query = new AdminDtos.OrderQuery();
        query.setOrderNo(withinOrderNo);
        query.setStartDate(LocalDate.now().minusDays(2));
        query.setEndDate(LocalDate.now());
        query.setPageNum(1);
        query.setPageSize(50);

        PageResult<Map<String, Object>> result = adminPortalService.pageOrders(query);
        assertThat(result.getList()).hasSize(1);
        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(((Number) result.getList().get(0).get("id")).longValue()).isEqualTo(withinRange.getId());

        query.setStartDate(LocalDate.now().minusDays(10));
        query.setEndDate(LocalDate.now().minusDays(8));
        PageResult<Map<String, Object>> outOfRange = adminPortalService.pageOrders(query);
        assertThat(outOfRange.getList()).isEmpty();
        assertThat(outOfRange.getTotal()).isZero();
    }

    @Test
    void shouldReturnEnhancedOrderDetailStatisticsAndMerchantRank() {
        Merchant merchant = merchant();
        User user = normalUser();
        ServiceItem serviceItem = approvedService(merchant.getId());
        OrderInfo orderInfo = insertOrder("ADMIN-DETAIL-" + System.currentTimeMillis(), user.getId(), merchant.getId(),
                serviceItem.getId(), "4", LocalDateTime.now().minusHours(8));
        orderInfo.setRemark("管理端详情字段校验");
        orderInfo.setPayTime(LocalDateTime.now().minusHours(7));
        orderInfo.setAcceptTime(LocalDateTime.now().minusHours(6));
        orderInfo.setStartTime(LocalDateTime.now().minusHours(5));
        orderInfo.setCompleteTime(LocalDateTime.now().minusHours(4));
        orderInfo.setUpdateTime(LocalDateTime.now().minusHours(4));
        orderInfoMapper.updateById(orderInfo);

        Map<String, Object> detail = adminPortalService.getOrderDetail(orderInfo.getId());
        assertThat(detail)
                .containsKeys("payTime", "acceptTime", "startTime", "completeTime", "address", "remark",
                        "serviceImage", "userName", "userPhone", "merchantName", "serviceImages");
        assertThat(detail.get("merchantName")).isEqualTo(merchant.getName());
        assertThat(detail.get("userPhone")).isEqualTo(user.getPhone());
        assertThat(detail.get("serviceImage")).isEqualTo(serviceItem.getImages());

        Map<String, Object> overview = adminPortalService.getStatisticsOverview();
        assertThat(overview)
                .containsKeys("pendingAudit", "pendingMerchantCount", "pendingServiceCount");
        long pendingAudit = ((Number) overview.get("pendingAudit")).longValue();
        long pendingMerchantCount = ((Number) overview.get("pendingMerchantCount")).longValue();
        long pendingServiceCount = ((Number) overview.get("pendingServiceCount")).longValue();
        assertThat(pendingAudit).isEqualTo(pendingMerchantCount + pendingServiceCount);

        List<Map<String, Object>> categoryRate = adminPortalService.getCategoryRate();
        assertThat(categoryRate).isNotEmpty();
        assertThat(categoryRate.get(0)).containsKeys("type", "percentage");
        assertThat(categoryRate)
                .allSatisfy(item -> assertThat(item.get("type")).isEqualTo("service"));

        List<Map<String, Object>> merchantRank = adminPortalService.getMerchantRank(5);
        assertThat(merchantRank).isNotEmpty();
        assertThat(merchantRank.get(0)).containsKeys("merchantId", "merchantName", "orderCount");
    }

    @Test
    void shouldValidateAuditRejectRemarkAndProtectReferencedCategory() {
        Merchant merchant = merchant();
        ServiceItem serviceItem = pendingService();

        AdminDtos.AuditRequest invalidStatus = new AdminDtos.AuditRequest();
        invalidStatus.setId(merchant.getId());
        invalidStatus.setStatus("9");
        assertThatThrownBy(() -> adminPortalService.auditMerchant(invalidStatus))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("0/1/2");

        AdminDtos.AuditRequest rejectMerchant = new AdminDtos.AuditRequest();
        rejectMerchant.setId(merchant.getId());
        rejectMerchant.setStatus("1");
        rejectMerchant.setRemark("   ");
        assertThatThrownBy(() -> adminPortalService.auditMerchant(rejectMerchant))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("审核备注不能为空");

        AdminDtos.AuditRequest rejectService = new AdminDtos.AuditRequest();
        rejectService.setId(serviceItem.getId());
        rejectService.setStatus("1");
        assertThatThrownBy(() -> adminPortalService.auditService(rejectService))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("审核备注不能为空");

        assertThatThrownBy(() -> adminPortalService.deleteCategory(serviceItem.getCategoryId()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("关联服务");

        Category removable = new Category();
        removable.setName("管理端测试分类-" + System.currentTimeMillis());
        removable.setSort(99);
        removable.setStatus(1);
        removable.setCreateTime(LocalDateTime.now());
        removable.setUpdateTime(LocalDateTime.now());
        categoryMapper.insert(removable);

        adminPortalService.deleteCategory(removable.getId());
        assertThat(categoryMapper.selectById(removable.getId())).isNull();
    }

    private Merchant merchant() {
        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getName, "安心家政")
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

    private ServiceItem approvedService(Long merchantId) {
        ServiceItem serviceItem = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchantId)
                .eq(ServiceItem::getAuditStatus, "2")
                .orderByAsc(ServiceItem::getId)
                .last("limit 1"));
        assertThat(serviceItem).isNotNull();
        return serviceItem;
    }

    private ServiceItem pendingService() {
        ServiceItem serviceItem = serviceItemMapper.selectOne(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getAuditStatus, "0")
                .orderByAsc(ServiceItem::getId)
                .last("limit 1"));
        assertThat(serviceItem).isNotNull();
        return serviceItem;
    }

    private OrderInfo insertOrder(String orderNo, Long userId, Long merchantId, Long serviceId, String status, LocalDateTime createTime) {
        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setOrderNo(orderNo);
        orderInfo.setUserId(userId);
        orderInfo.setMerchantId(merchantId);
        orderInfo.setServiceId(serviceId);
        orderInfo.setStatus(status);
        orderInfo.setAddress("管理端测试地址");
        orderInfo.setAppointDate(createTime.toLocalDate().plusDays(1));
        orderInfo.setAppointSlot("上午 (08:00-12:00)");
        orderInfo.setRemark("管理端测试订单");
        orderInfo.setTotalPrice(BigDecimal.valueOf(88));
        orderInfo.setPayTime(createTime.plusMinutes(10));
        orderInfo.setCreateTime(createTime);
        orderInfo.setUpdateTime(createTime.plusMinutes(10));
        orderInfo.setIsCommented(0);
        orderInfoMapper.insert(orderInfo);
        return orderInfoMapper.selectById(orderInfo.getId());
    }
}
