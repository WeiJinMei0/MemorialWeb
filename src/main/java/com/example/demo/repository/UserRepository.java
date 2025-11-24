package com.example.demo.repository;

import com.example.demo.persistence.entity.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByUsernameIgnoreCase(String username);

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    Optional<UserEntity> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);
}
