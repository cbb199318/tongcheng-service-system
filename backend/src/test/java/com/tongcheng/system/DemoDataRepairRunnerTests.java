package com.tongcheng.system;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.config.DemoDataRepairRunner;
import com.tongcheng.system.entity.Banner;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.OrderInfo;
import com.tongcheng.system.entity.Review;
import com.tongcheng.system.entity.ServiceItem;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.mapper.BannerMapper;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.OrderInfoMapper;
import com.tongcheng.system.mapper.ReviewMapper;
import com.tongcheng.system.mapper.ServiceItemMapper;
import com.tongcheng.system.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:demo-repair-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Transactional
class DemoDataRepairRunnerTests {

    @Autowired
    private DemoDataRepairRunner demoDataRepairRunner;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private BannerMapper bannerMapper;

    @Autowired
    private MerchantMapper merchantMapper;

    @Autowired
    private ServiceItemMapper serviceItemMapper;

    @Autowired
    private OrderInfoMapper orderInfoMapper;

    @Autowired
    private ReviewMapper reviewMapper;

    @Test
    void shouldSeedStableDemoAssetsAndReviewableOrder() {
        assertThat(new ClassPathResource("static/upload/demo/banner-1.svg").exists()).isTrue();
        assertThat(new ClassPathResource("static/upload/demo/merchant-1-logo.svg").exists()).isTrue();

        List<Banner> banners = bannerMapper.selectList(new LambdaQueryWrapper<Banner>().orderByAsc(Banner::getId));
        assertThat(banners).isNotEmpty();
        assertThat(banners)
                .extracting(Banner::getImageUrl)
                .allMatch(url -> url != null && url.startsWith("/upload/demo/") && !url.contains("picsum"));

        List<Merchant> merchants = merchantMapper.selectList(new LambdaQueryWrapper<Merchant>().orderByAsc(Merchant::getId));
        assertThat(merchants).isNotEmpty();
        assertThat(merchants)
                .allMatch(merchant -> merchant.getLogo() != null && merchant.getLogo().startsWith("/upload/demo/"));
        assertThat(merchants)
                .allMatch(merchant -> merchant.getLicense() != null && merchant.getLicense().startsWith("/upload/demo/"));

        List<ServiceItem> services = serviceItemMapper.selectList(new LambdaQueryWrapper<ServiceItem>().orderByAsc(ServiceItem::getId));
        assertThat(services).isNotEmpty();
        assertThat(services)
                .extracting(ServiceItem::getImages)
                .allMatch(images -> images != null && images.startsWith("/upload/demo/") && !images.contains("picsum"));

        User user01 = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, "user01")
                .last("limit 1"));
        assertThat(user01).isNotNull();

        OrderInfo reviewableOrder = latestReviewableOrder(user01.getId());
        assertThat(reviewableOrder).isNotNull();
        assertThat(reviewMapper.selectCount(new LambdaQueryWrapper<com.tongcheng.system.entity.Review>()
                .eq(com.tongcheng.system.entity.Review::getOrderId, reviewableOrder.getId()))).isZero();

        User merchantUser = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, "merchant01")
                .last("limit 1"));
        assertThat(merchantUser).isNotNull();

        Merchant merchant01 = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, merchantUser.getId())
                .last("limit 1"));
        assertThat(merchant01).isNotNull();

        assertThat(serviceItemMapper.selectCount(new LambdaQueryWrapper<ServiceItem>()
                .eq(ServiceItem::getMerchantId, merchant01.getId())
                .eq(ServiceItem::getAuditStatus, "0"))).isGreaterThan(0);
        assertThat(orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getMerchantId, merchant01.getId())
                .eq(OrderInfo::getStatus, "1"))).isGreaterThan(0);
        assertThat(orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getMerchantId, merchant01.getId())
                .in(OrderInfo::getStatus, "2", "3"))).isGreaterThan(0);

        List<Review> pendingReplyReviews = reviewMapper.selectList(new LambdaQueryWrapper<Review>()
                .eq(Review::getMerchantId, merchant01.getId())
                .and(wrapper -> wrapper.isNull(Review::getReply).or().eq(Review::getReply, "")));
        assertThat(pendingReplyReviews)
                .anySatisfy(review -> {
                    OrderInfo orderInfo = orderInfoMapper.selectById(review.getOrderId());
                    assertThat(orderInfo).isNotNull();
                    assertThat(orderInfo.getStatus()).isEqualTo("4");
                });
    }

    @Test
    void shouldInsertReviewableOrderWhenUser01HasNone() {
        User user01 = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, "user01")
                .last("limit 1"));
        assertThat(user01).isNotNull();

        List<OrderInfo> existingOrders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, user01.getId())
                .eq(OrderInfo::getStatus, "4")
                .eq(OrderInfo::getIsCommented, 0));
        existingOrders.forEach(order -> {
            order.setIsCommented(1);
            orderInfoMapper.updateById(order);
        });

        long totalBefore = orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, user01.getId()));

        demoDataRepairRunner.ensureUser01HasPendingReviewOrder();

        OrderInfo repairedOrder = latestReviewableOrder(user01.getId());
        assertThat(repairedOrder).isNotNull();
        assertThat(repairedOrder.getRemark()).contains("评价链路复测");

        long totalAfter = orderInfoMapper.selectCount(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, user01.getId()));
        assertThat(totalAfter).isEqualTo(totalBefore + 1);
    }

    private OrderInfo latestReviewableOrder(Long userId) {
        List<OrderInfo> orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, userId)
                .eq(OrderInfo::getStatus, "4")
                .eq(OrderInfo::getIsCommented, 0)
                .orderByDesc(OrderInfo::getCreateTime));
        return orders.stream()
                .filter(order -> reviewMapper.selectCount(new LambdaQueryWrapper<com.tongcheng.system.entity.Review>()
                        .eq(com.tongcheng.system.entity.Review::getOrderId, order.getId())) == 0)
                .findFirst()
                .orElse(null);
    }
}
