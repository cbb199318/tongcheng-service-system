package com.tongcheng.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("merchant")
public class Merchant {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String name;
    private String logo;
    private String phone;
    private String address;
    private String intro;
    private String auditStatus;
    private String auditRemark;
    private BigDecimal rating;
    private Integer orderCount;
    private String license;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
