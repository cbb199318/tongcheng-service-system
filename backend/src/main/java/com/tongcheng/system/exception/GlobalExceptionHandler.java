package com.tongcheng.system.exception;

import com.tongcheng.system.common.ApiResponse;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ApiResponse<Void> handleAppException(AppException ex) {
        return ApiResponse.error(ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ApiResponse<Void> handleValidationException(Exception ex) {
        String message = "参数校验失败";
        if (ex instanceof MethodArgumentNotValidException) {
            MethodArgumentNotValidException validException = (MethodArgumentNotValidException) ex;
            if (validException.getBindingResult().getFieldError() != null) {
                message = validException.getBindingResult().getFieldError().getDefaultMessage();
            }
        }
        if (ex instanceof BindException) {
            BindException bindException = (BindException) ex;
            if (bindException.getBindingResult().getFieldError() != null) {
                message = bindException.getBindingResult().getFieldError().getDefaultMessage();
            }
        }
        return ApiResponse.error(400, message);
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleException(Exception ex) {
        return ApiResponse.error(500, ex.getMessage() == null ? "系统异常" : ex.getMessage());
    }
}
