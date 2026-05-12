package com.tongcheng.system;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.tongcheng.system.mapper")
public class TongchengServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TongchengServiceApplication.class, args);
    }
}
