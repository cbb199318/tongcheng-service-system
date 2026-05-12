package com.tongcheng.system.exception;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {
    private final Integer code;

    public AppException(Integer code, String message) {
        super(message);
        this.code = code;
    }

    public static AppException badRequest(String message) {
        return new AppException(400, message);
    }

    public static AppException unauthorized(String message) {
        return new AppException(401, message);
    }

    public static AppException forbidden(String message) {
        return new AppException(403, message);
    }

    public static AppException notFound(String message) {
        return new AppException(404, message);
    }
}
