package com.tongcheng.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("order_message")
public class OrderMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private String senderRole;
    private Long senderUserId;
    private String content;
    private LocalDateTime createTime;
}
