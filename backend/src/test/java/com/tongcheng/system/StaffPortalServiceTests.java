package com.tongcheng.system;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.common.PageResult;
import com.tongcheng.system.dto.MerchantDtos;
import com.tongcheng.system.dto.StaffDtos;
import com.tongcheng.system.dto.UserDtos;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.StaffMember;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.StaffMemberMapper;
import com.tongcheng.system.mapper.UserMapper;
import com.tongcheng.system.service.MerchantPortalService;
import com.tongcheng.system.service.StaffPortalService;
import com.tongcheng.system.service.UserPortalService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:staff-portal-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Transactional
class StaffPortalServiceTests {

    @Autowired
    private MerchantPortalService merchantPortalService;

    @Autowired
    private StaffPortalService staffPortalService;

    @Autowired
    private UserPortalService userPortalService;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private MerchantMapper merchantMapper;

    @Autowired
    private ServiceItemMapper serviceItemMapper;

    @Autowired
    private OrderInfoMapper orderInfoMapper;

    @Autowired
    private StaffMemberMapper staffMemberMapper;

    @Test
    void shouldCreateAssignAndProcessStaffOrders() {
        User merchantUser = merchantUser();
        Merchant merchant = merchant();

        MerchantDtos.StaffSaveRequest createRequest = new MerchantDtos.StaffSaveRequest();
        createRequest.setName("测试员工");
        createRequest.setPhone("13800000028");
        createRequest.setSpecialty("家电清洗");
        Map<String, Object> created = merchantPortalService.createStaff(merchantUser.getId(), createRequest);
        assertThat(created).containsKeys("id", "username", "initialPassword");

        Long staffId = ((Number) created.get("id")).longValue();
        StaffMember staffMember = staffMemberMapper.selectById(staffId);
        assertThat(staffMember).isNotNull();

        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setOrderNo("STAFF-ORDER-" + System.currentTimeMillis());
        orderInfo.setUserId(normalUser().getId());
        orderInfo.setMerchantId(merchant.getId());
        orderInfo.setServiceId(approvedService(merchant.getId()).getId());
        orderInfo.setStatus("2");
        orderInfo.setAddress("服务人员测试地址");
        orderInfo.setAppointDate(LocalDate.now().plusDays(1));
        orderInfo.setAppointSlot("上午 (08:00-12:00)");
        orderInfo.setRemark("测试 staff 订单");
        orderInfo.setTotalPrice(approvedService(merchant.getId()).getPrice());
        orderInfo.setPayTime(LocalDateTime.now().minusHours(3));
        orderInfo.setAcceptTime(LocalDateTime.now().minusHours(2));
        orderInfo.setIsCommented(0);
        orderInfo.setCreateTime(LocalDateTime.now().minusHours(4));
        orderInfo.setUpdateTime(LocalDateTime.now().minusHours(2));
        orderInfoMapper.insert(orderInfo);

        MerchantDtos.OrderAssignStaffRequest assignRequest = new MerchantDtos.OrderAssignStaffRequest();
        assignRequest.setOrderId(orderInfo.getId());
        assignRequest.setStaffId(staffId);
        merchantPortalService.assignStaff(merchantUser.getId(), assignRequest);

        User staffUser = userMapper.selectById(staffMember.getUserId());
        PageResult<Map<String, Object>> orderPage = staffPortalService.pageOrders(staffUser.getId(), new StaffDtos.OrderQuery());
        assertThat(orderPage.getList()).isNotEmpty();
        assertThat(orderPage.getList().get(0)).containsKeys("serviceName", "merchantName", "staff");

        staffPortalService.startOrder(staffUser.getId(), orderInfo.getId());
        assertThat(orderInfoMapper.selectById(orderInfo.getId()).getStatus()).isEqualTo("3");

        staffPortalService.completeOrder(staffUser.getId(), orderInfo.getId());
        assertThat(orderInfoMapper.selectById(orderInfo.getId()).getStatus()).isEqualTo("4");
    }

    @Test
    void shouldRestrictMessagesToParticipants() {
        User merchantUser = merchantUser();
        User user = normalUser();
        User otherUser = otherUser();
        StaffMember demoStaff = staffMemberMapper.selectOne(new LambdaQueryWrapper<StaffMember>()
                .eq(StaffMember::getMerchantId, merchant().getId())
                .last("limit 1"));
        assertThat(demoStaff).isNotNull();

        OrderInfo orderInfo = orderInfoMapper.selectOne(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getStaffId, demoStaff.getId())
                .last("limit 1"));
        assertThat(orderInfo).isNotNull();

        MerchantDtos.MessageSendRequest merchantMessage = new MerchantDtos.MessageSendRequest();
        merchantMessage.setOrderId(orderInfo.getId());
        merchantMessage.setContent("商家已为你分配服务人员");
        merchantPortalService.sendOrderMessage(merchantUser.getId(), merchantMessage);

        UserDtos.MessageSendRequest userMessage = new UserDtos.MessageSendRequest();
        userMessage.setOrderId(orderInfo.getId());
        userMessage.setContent("收到，明天下午方便上门");
        userPortalService.sendOrderMessage(user.getId(), userMessage);

        List<Map<String, Object>> messages = staffPortalService.listOrderMessages(demoStaff.getUserId(), orderInfo.getId());
        assertThat(messages).hasSizeGreaterThanOrEqualTo(2);

        assertThatThrownBy(() -> userPortalService.listOrderMessages(otherUser.getId(), orderInfo.getId()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("无权");
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

    private User otherUser() {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, "user01")
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
}
