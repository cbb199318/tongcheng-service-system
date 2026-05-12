package com.tongcheng.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("service_item")
public class ServiceItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long merchantId;
    private Long categoryId;
    private String name;
    private BigDecimal price;
    private Integer duration;
    private String description;
    private String images;
    private String tags;
    private Integer sales;
    private Integer status;
    private String auditStatus;
    private String auditRemark;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
