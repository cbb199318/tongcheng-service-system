package com.tongcheng.system.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public final class StaffDtos {
    private StaffDtos() {
    }

    @Data
    public static class OrderQuery {
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
    public static class MessageSendRequest {
        @NotNull(message = "订单ID不能为空")
        private Long orderId;
        @NotBlank(message = "消息内容不能为空")
        private String content;
    }
}
