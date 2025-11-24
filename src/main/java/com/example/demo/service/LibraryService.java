package com.example.demo.service;

import com.example.demo.dto.library.CreateLibraryItemRequest;
import com.example.demo.dto.library.LibraryItemResponse;
import com.example.demo.dto.library.UpdateLibraryItemRequest;
import com.example.demo.exception.ApiException;
import com.example.demo.persistence.entity.LibraryItemEntity;
import com.example.demo.repository.LibraryItemRepository;
import com.example.demo.util.IdUtils;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class LibraryService {

    private final LibraryItemRepository repository;

    public LibraryService(LibraryItemRepository repository) {
        this.repository = repository;
    }

    public LibraryItemResponse create(Long userId, CreateLibraryItemRequest request) {
        LibraryItemEntity item = new LibraryItemEntity();
        item.setUserId(userId);
        item.setType(request.type());
        item.setSlotIndex(request.slotIndex());
        item.setThumbnail(request.thumbnail());
        item.setData(request.data());
        repository.save(item);
        return toResponse(item);
    }

    public List<LibraryItemResponse> list(Long userId) {
        return repository.findByUserId(userId).stream()
                .sorted(Comparator.comparingInt(LibraryItemEntity::getSlotIndex))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public LibraryItemResponse update(Long userId, String id, UpdateLibraryItemRequest request) {
        LibraryItemEntity item = repository.findByIdAndUserId(parseId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Library item not found"));
        item.setSlotIndex(request.slotIndex());
        repository.save(item);
        return toResponse(item);
    }

    public void delete(Long userId, String id) {
        LibraryItemEntity item = repository.findByIdAndUserId(parseId(id), userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Library item not found"));
        repository.delete(item);
    }

    private LibraryItemResponse toResponse(LibraryItemEntity item) {
        return new LibraryItemResponse(
                IdUtils.formatLibraryItemId(item.getId()),
                item.getType(),
                item.getSlotIndex(),
                item.getThumbnail(),
                item.getData(),
                item.getCreatedAt(),
                item.getUpdatedAt());
    }

    private Long parseId(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid library item id");
        }
    }
}
