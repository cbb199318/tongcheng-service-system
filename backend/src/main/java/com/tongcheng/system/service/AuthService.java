package com.tongcheng.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tongcheng.system.dto.AuthDtos;
import com.tongcheng.system.entity.Merchant;
import com.tongcheng.system.entity.User;
import com.tongcheng.system.exception.AppException;
import com.tongcheng.system.mapper.MerchantMapper;
import com.tongcheng.system.mapper.UserMapper;
import com.tongcheng.system.security.JwtUtils;
import com.tongcheng.system.security.LoginUser;
import com.tongcheng.system.security.UserContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final MerchantMapper merchantMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(UserMapper userMapper, MerchantMapper merchantMapper, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userMapper = userMapper;
        this.merchantMapper = merchantMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @Transactional
    public void register(AuthDtos.RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw AppException.badRequest("两次密码输入必须一致");
        }
        User existed = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, request.getUsername()));
        if (existed != null) {
            throw AppException.badRequest("用户名已存在");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setPhone(request.getPhone());
        user.setRole("user");
        user.setStatus(1);
        user.setPoints(0);
        userMapper.insert(user);
    }

    public Map<String, Object> login(AuthDtos.LoginRequest request, String requiredRole) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, request.getUsername()));
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw AppException.badRequest("用户名或密码错误");
        }
        if (!Integer.valueOf(1).equals(user.getStatus())) {
            throw AppException.badRequest("账号已被禁用");
        }
        if (requiredRole != null && !requiredRole.equals(user.getRole())) {
            throw AppException.forbidden("当前账号无对应端访问权限");
        }

        LoginUser loginUser = new LoginUser(user.getId(), user.getUsername(), user.getRole());
        String token = jwtUtils.generateToken(loginUser);
        return buildLoginResponse(user, token);
    }

    public Map<String, Object> getCurrentUserInfo() {
        LoginUser loginUser = requireCurrentUser();
        User user = getUserById(loginUser.getUserId());
        return buildLoginResponse(user, null);
    }

    public Map<String, Object> getMerchantCurrentInfo() {
        LoginUser loginUser = requireCurrentUser();
        User user = getUserById(loginUser.getUserId());
        Merchant merchant = merchantMapper.selectOne(new LambdaQueryWrapper<Merchant>()
                .eq(Merchant::getUserId, user.getId()));
        Map<String, Object> data = buildLoginResponse(user, null);
        data.put("merchant", merchant);
        return data;
    }

    public Map<String, Object> getAdminCurrentInfo() {
        return getCurrentUserInfo();
    }

    public User getUserById(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw AppException.notFound("用户不存在");
        }
        return user;
    }

    public LoginUser requireCurrentUser() {
        LoginUser loginUser = UserContext.get();
        if (loginUser == null) {
            throw AppException.unauthorized("登录已失效，请重新登录");
        }
        return loginUser;
    }

    private Map<String, Object> buildLoginResponse(User user, String token) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (token != null) {
            data.put("token", token);
        }
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("phone", user.getPhone());
        data.put("avatar", user.getAvatar());
        data.put("role", user.getRole());
        data.put("status", user.getStatus());
        data.put("points", user.getPoints());
        return data;
    }
}
