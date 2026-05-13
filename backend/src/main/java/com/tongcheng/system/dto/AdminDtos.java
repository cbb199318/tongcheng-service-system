package com.tongcheng.system.dto;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;

public final class AdminDtos {
    private AdminDtos() {
    }

    @Data
    public static class UserQuery {
        private String keyword;
        private String role;
        private Integer status;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class UserStatusRequest {
        @NotNull(message = "用户ID不能为空")
        private Long userId;
    }

    @Data
    public static class MerchantQuery {
        private String keyword;
        private String auditStatus;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class AuditRequest {
        @NotNull(message = "业务ID不能为空")
        private Long id;
        @NotBlank(message = "审核状态不能为空")
        private String status;
        private String remark;

        public String getStatus() {
            return status == null ? null : status.trim();
        }

        public String getRemark() {
            return remark == null ? null : remark.trim();
        }
    }

    @Data
    public static class ServiceQuery {
        private String keyword;
        private String auditStatus;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class CategorySaveRequest {
        private Long id;
        @NotBlank(message = "分类名称不能为空")
        private String name;
        private String icon;
        private Integer sort = 0;
        private Integer status = 1;
    }

    @Data
    public static class OrderQuery {
        private String orderNo;
        private String status;
        @DateTimeFormat(pattern = "yyyy-MM-dd")
        private LocalDate startDate;
        @DateTimeFormat(pattern = "yyyy-MM-dd")
        private LocalDate endDate;
        private Integer pageNum = 1;
        private Integer pageSize = 10;
    }

    @Data
    public static class NoticeSaveRequest {
        private Long id;
        @NotBlank(message = "公告标题不能为空")
        private String title;
        @NotBlank(message = "公告内容不能为空")
        private String content;
        private Integer status = 1;
    }

    @Data
    public static class BannerSaveRequest {
        private Long id;
        private String title;
        @NotBlank(message = "图片地址不能为空")
        private String imageUrl;
        private String linkUrl;
        private Integer sort = 0;
        private Integer status = 1;
    }
}
