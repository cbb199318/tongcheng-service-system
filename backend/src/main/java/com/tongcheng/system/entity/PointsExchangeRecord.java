package com.tongcheng.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("points_exchange_record")
public class PointsExchangeRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String itemCode;
    private String itemName;
    private Integer pointsCost;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
