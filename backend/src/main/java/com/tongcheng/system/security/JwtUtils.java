package com.tongcheng.system.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expire-hours}")
    private Integer expireHours;

    private Key key;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(LoginUser loginUser) {
        Date expireAt = Date.from(LocalDateTime.now().plusHours(expireHours)
                .atZone(ZoneId.systemDefault())
                .toInstant());
        return Jwts.builder()
                .claim("userId", loginUser.getUserId())
                .claim("username", loginUser.getUsername())
                .claim("role", loginUser.getRole())
                .setExpiration(expireAt)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public LoginUser parseToken(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        return new LoginUser(
                ((Number) claims.get("userId")).longValue(),
                String.valueOf(claims.get("username")),
                String.valueOf(claims.get("role"))
        );
    }
}
