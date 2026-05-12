package com.tongcheng.system.security;

import com.tongcheng.system.exception.AppException;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtils jwtUtils;

    public AuthInterceptor(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }
        HandlerMethod handlerMethod = (HandlerMethod) handler;
        RequireRole methodRole = handlerMethod.getMethodAnnotation(RequireRole.class);
        RequireRole classRole = handlerMethod.getBeanType().getAnnotation(RequireRole.class);
        RequireRole requireRole = methodRole != null ? methodRole : classRole;
        if (requireRole == null) {
            return true;
        }
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw AppException.unauthorized("登录已失效，请重新登录");
        }
        String token = authorization.substring(7);
        try {
            LoginUser loginUser = jwtUtils.parseToken(token);
            Set<String> roleSet = new HashSet<>(Arrays.asList(requireRole.value()));
            if (!roleSet.contains(loginUser.getRole())) {
                throw AppException.forbidden("无权访问该接口");
            }
            UserContext.set(loginUser);
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            throw AppException.unauthorized("登录已失效，请重新登录");
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
