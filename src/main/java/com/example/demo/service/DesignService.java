package com.example.demo.service;

import com.example.demo.common.PagedResult;
import com.example.demo.dto.design.CreateDesignRequest;
import com.example.demo.dto.design.DesignListItem;
import com.example.demo.dto.design.DesignResponse;
import com.example.demo.exception.ApiException;
import com.example.demo.persistence.entity.DesignEntity;
import com.example.demo.repository.DesignRepository;
import com.example.demo.util.IdUtils;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DesignService {

    private final DesignRepository designRepository;

    public DesignService(DesignRepository designRepository) {
        this.designRepository = designRepository;
    }

    public DesignResponse create(Long userId, CreateDesignRequest request) {
        DesignEntity design = new DesignEntity();
        design.setUserId(userId);
        design.setName(request.name());
        design.setThumbnail(request.thumbnail());
        design.setDesignState(request.designState());
        designRepository.save(design);
        return toResponse(design);
    }

    public PagedResult<DesignListItem> list(Long userId, Integer page, Integer pageSize, String keyword) {
        int safePage = page == null || page < 1 ? 1 : page;
        int safeSize = pageSize == null || pageSize < 1 ? 10 : Math.min(pageSize, 100);
        List<DesignEntity> all = designRepository.findByUserId(userId);
        if (StringUtils.hasText(keyword)) {
            String lower = keyword.toLowerCase();
            all = all.stream()
                    .filter(d -> d.getName() != null && d.getName().toLowerCase().contains(lower))
                    .collect(Collectors.toList());
        }
        all.sort(Comparator.comparing(DesignEntity::getUpdatedAt).reversed());
        int from = Math.min((safePage - 1) * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        List<DesignListItem> items = all.subList(from, to).stream()
                .map(this::toListItem)
                .collect(Collectors.toList());
        return new PagedResult<>(items, all.size(), safePage, safeSize);
    }

    public DesignResponse getDetail(Long userId, String id) {
        DesignEntity design = designRepository.findByIdAndUserId(IdUtils.parseDesignId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Design not found"));
        return toResponse(design);
    }

    public DesignResponse update(Long userId, String id, CreateDesignRequest request) {
        DesignEntity design = designRepository.findByIdAndUserId(IdUtils.parseDesignId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Design not found"));
        design.setName(request.name());
        design.setThumbnail(request.thumbnail());
        design.setDesignState(request.designState());
        designRepository.save(design);
        return toResponse(design);
    }

    public void delete(Long userId, String id) {
        DesignEntity design = designRepository.findByIdAndUserId(IdUtils.parseDesignId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Design not found"));
        designRepository.delete(design);
    }

    private DesignResponse toResponse(DesignEntity design) {
        return new DesignResponse(
                IdUtils.formatDesignId(design.getId()),
                design.getName(),
                design.getThumbnail(),
                design.getDesignState(),
                design.getCreatedAt(),
                design.getUpdatedAt());
    }

    private DesignListItem toListItem(DesignEntity design) {
        return new DesignListItem(
                IdUtils.formatDesignId(design.getId()),
                design.getName(),
                design.getThumbnail(),
                design.getUpdatedAt());
    }
}
