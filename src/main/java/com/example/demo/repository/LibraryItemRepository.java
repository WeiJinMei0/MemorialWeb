package com.example.demo.repository;

import com.example.demo.persistence.entity.LibraryItemEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LibraryItemRepository extends JpaRepository<LibraryItemEntity, Long> {

    List<LibraryItemEntity> findByUserId(Long userId);

    Optional<LibraryItemEntity> findByIdAndUserId(Long id, Long userId);
}
