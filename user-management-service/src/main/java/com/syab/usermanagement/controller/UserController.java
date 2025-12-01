package com.syab.usermanagement.controller;

import com.syab.usermanagement.dto.AuthRequest;
import com.syab.usermanagement.dto.AuthResponse;
import com.syab.usermanagement.dto.UserDTO;
import com.syab.usermanagement.dto.UserRegistrationRequest;
import com.syab.usermanagement.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Operation 1: Register a new user
     * POST /api/users/register
     */
    @PostMapping("/register")
    public ResponseEntity<UserDTO> registerUser(@Valid @RequestBody UserRegistrationRequest request) {
        UserDTO user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /**
     * Operation 2: Authenticate user and get JWT token
     * POST /api/users/authenticate
     */
    @PostMapping("/authenticate")
    public ResponseEntity<AuthResponse> authenticateUser(@RequestBody AuthRequest request) {
        AuthResponse response = userService.authenticateUser(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Operation 3: Get user profile
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getUserProfile(@PathVariable Long userId) {
        UserDTO user = userService.getUserProfile(userId);
        return ResponseEntity.ok(user);
    }

    /**
     * Find user by email
     * GET /api/users/by-email?email=...
     */
    @GetMapping("/by-email")
    public ResponseEntity<UserDTO> getUserByEmail(@RequestParam String email) {
        log.debug("GET /api/users/by-email called with email={}", email);
        try {
            UserDTO dto = userService.getUserByEmail(email);
            log.debug("getUserByEmail: found user id={} for email={}", dto.getId(), email);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException ex) {
            log.debug("getUserByEmail: no user found for email={}", email);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Operation 3 (Extended): Update user profile
     * PUT /api/users/{userId}
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserDTO> updateUserProfile(@PathVariable Long userId, @Valid @RequestBody UserRegistrationRequest request) {
        UserDTO user = userService.updateUserProfile(userId, request);
        return ResponseEntity.ok(user);
    }
}
