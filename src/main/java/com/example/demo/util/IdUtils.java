package com.example.demo.util;

import com.example.demo.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;

public final class IdUtils {

    private IdUtils() {
    }

    public static String formatDesignId(Long id) {
        return format("design", id);
    }

    public static String formatOrderId(Long id) {
        return format("order", id);
    }

    public static String formatLibraryItemId(Long id) {
        return String.valueOf(id);
    }

    public static Long parseDesignId(String raw) {
        return parse("design", raw);
    }

    public static Long parseOrderId(String raw) {
        return parse("order", raw);
    }

    private static String format(String prefix, Long id) {
        if (id == null) {
            return null;
        }
        return prefix + "_" + id;
    }

    private static Long parse(String prefix, String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "无效的 " + prefix + " ID");
        }
        String normalized = raw.trim().toLowerCase();
        String expectedPrefix = prefix.toLowerCase() + "_";
        if (!normalized.startsWith(expectedPrefix)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "无效的 " + prefix + " ID");
        }
        try {
            return Long.parseLong(normalized.substring(expectedPrefix.length()));
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "无效的 " + prefix + " ID");
        }
    }
}
