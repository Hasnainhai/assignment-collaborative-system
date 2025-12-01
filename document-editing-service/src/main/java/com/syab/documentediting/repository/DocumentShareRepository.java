package com.syab.documentediting.repository;

import com.syab.documentediting.model.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {
    List<DocumentShare> findByUserId(Long userId);
    List<DocumentShare> findByDocumentId(Long documentId);
    Optional<DocumentShare> findByDocumentIdAndUserId(Long documentId, Long userId);
}
