package com.example.demo.repository;

import com.example.demo.persistence.entity.DesignEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesignRepository extends JpaRepository<DesignEntity, Long> {

    List<DesignEntity> findByUserId(Long userId);

    Optional<DesignEntity> findByIdAndUserId(Long id, Long userId);
}
