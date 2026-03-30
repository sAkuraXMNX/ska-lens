package com.ska.skaLensBackend.config;

import com.ska.skaLensBackend.model.User;
import com.ska.skaLensBackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;

@Configuration
public class AdminInitializer {

    @Bean
    @ConditionalOnProperty(name = "app.admin.init-enabled", havingValue = "true", matchIfMissing = true)
    CommandLineRunner ensureAdminUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username:admin}") String adminUsername,
            @Value("${app.admin.password:admin123456}") String adminPassword
    ) {
        return args -> userRepository.findByUsername(adminUsername)
                .orElseGet(() -> userRepository.save(User.builder()
                        .username(adminUsername)
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .roles(List.of(User.Role.ADMIN))
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));
    }
}
