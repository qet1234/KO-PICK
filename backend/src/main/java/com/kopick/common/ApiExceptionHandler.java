package com.kopick.common;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    ResponseEntity<Map<String, Object>> badRequest(Exception error) {
        return response(HttpStatus.BAD_REQUEST, error.getMessage());
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    ResponseEntity<Map<String, Object>> unauthorized(AuthenticationCredentialsNotFoundException error) {
        return response(HttpStatus.UNAUTHORIZED, error.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String, Object>> conflict(IllegalStateException error) {
        return response(HttpStatus.CONFLICT, error.getMessage());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> serverError(Exception error) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "서버 처리 중 오류가 발생했습니다.");
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "success", false,
            "error", message == null || message.isBlank() ? status.getReasonPhrase() : message
        ));
    }
}
