package com.tongcheng.system.controller;

import com.tongcheng.system.common.ApiResponse;
import com.tongcheng.system.security.RequireRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/common")
public class CommonController {

    @Value("${app.upload-dir}")
    private String uploadDir;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequireRole({"user", "merchant", "admin", "staff"})
    public ApiResponse<Map<String, Object>> upload(@RequestPart("file") MultipartFile file) throws IOException {
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString().replace("-", "");
        if (extension != null && !extension.isBlank()) {
            fileName = fileName + "." + extension;
        }
        Path targetDirPath = Paths.get(uploadDir, LocalDate.now().toString()).toAbsolutePath().normalize();
        File targetDir = targetDirPath.toFile();
        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }
        File targetFile = new File(targetDir, fileName);
        file.transferTo(targetFile);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("url", "/upload/" + LocalDate.now() + "/" + fileName);
        return ApiResponse.success("上传成功", data);
    }
}
