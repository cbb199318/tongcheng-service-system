package com.tongcheng.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("order_info")
public class OrderInfo {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long userId;
    private Long merchantId;
    private Long serviceId;
    private String status;
    private String address;
    private LocalDate appointDate;
    private String appointSlot;
    private String remark;
    private BigDecimal totalPrice;
    private LocalDateTime payTime;
    private LocalDateTime acceptTime;
    private LocalDateTime startTime;
    private LocalDateTime completeTime;
    private LocalDateTime cancelTime;
    private String cancelReason;
    private Integer isCommented;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
