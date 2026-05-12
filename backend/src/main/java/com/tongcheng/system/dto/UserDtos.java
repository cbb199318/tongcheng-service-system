package com.tongcheng.system.dto;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public final class UserDtos {
    private UserDtos() {
    }

    @Data
    public static class ServiceQuery {
        private String keyword;
        private Long categoryId;
        private String sortType;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class CreateOrderRequest {
        @NotNull(message = "服务ID不能为空")
        private Long serviceId;
        @NotNull(message = "预约日期不能为空")
        @DateTimeFormat(pattern = "yyyy-MM-dd")
        private LocalDate appointDate;
        @NotBlank(message = "预约时段不能为空")
        private String appointSlot;
        @NotBlank(message = "服务地址不能为空")
        private String address;
        private String remark;
    }

    @Data
    public static class OrderPageQuery {
        private String status;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class OrderActionRequest {
        @NotNull(message = "订单ID不能为空")
        private Long orderId;
    }

    @Data
    public static class CancelOrderRequest {
        @NotNull(message = "订单ID不能为空")
        private Long orderId;
        @NotBlank(message = "取消原因不能为空")
        private String reason;
    }

    @Data
    public static class ReviewCreateRequest {
        @NotNull(message = "订单ID不能为空")
        private Long orderId;
        @NotNull(message = "服务ID不能为空")
        private Long serviceId;
        @NotNull(message = "商家ID不能为空")
        private Long merchantId;
        @NotNull(message = "评分不能为空")
        @Min(value = 1, message = "评分至少为1")
        @Max(value = 5, message = "评分最多为5")
        private Integer rating;
        private String content;
        private List<String> images;
    }

    @Data
    public static class MerchantApplyRequest {
        @NotBlank(message = "商家名称不能为空")
        private String name;
        @NotBlank(message = "联系电话不能为空")
        private String phone;
        @NotBlank(message = "商家地址不能为空")
        private String address;
        private String intro;
        @NotBlank(message = "资质文件不能为空")
        private String license;
    }
}
