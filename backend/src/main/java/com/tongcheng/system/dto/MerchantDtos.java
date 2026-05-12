package com.tongcheng.system.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;

public final class MerchantDtos {
    private MerchantDtos() {
    }

    @Data
    public static class MerchantUpdateRequest {
        @NotBlank(message = "商家名称不能为空")
        private String name;
        @NotBlank(message = "联系电话不能为空")
        private String phone;
        @NotBlank(message = "地址不能为空")
        private String address;
        private String intro;
        private String logo;
        private String license;
    }

    @Data
    public static class ServiceQuery {
        private String name;
        private String auditStatus;
        private String status;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class ServiceSaveRequest {
        private Long id;
        @NotNull(message = "分类ID不能为空")
        private Long categoryId;
        @NotBlank(message = "服务名称不能为空")
        private String name;
        @NotNull(message = "服务价格不能为空")
        private BigDecimal price;
        private Integer duration;
        private String description;
        private String images;
        private String tags;
    }

    @Data
    public static class ServiceStatusRequest {
        @NotNull(message = "服务ID不能为空")
        private Long serviceId;
        @NotNull(message = "状态不能为空")
        private Integer status;
    }

    @Data
    public static class OrderQuery {
        private String status;
        private String orderNo;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class OrderActionRequest {
        @NotNull(message = "订单ID不能为空")
        private Long orderId;
        private String reason;
    }

    @Data
    public static class ReviewReplyRequest {
        @NotNull(message = "评价ID不能为空")
        private Long reviewId;
        @NotBlank(message = "回复内容不能为空")
        private String reply;
    }

    @Data
    public static class ReviewQuery {
        private Integer hasReply;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }
}
