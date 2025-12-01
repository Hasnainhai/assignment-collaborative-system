package com.syab.documentediting.service;

import com.syab.documentediting.dto.DocumentChangeDTO;
import com.syab.documentediting.dto.DocumentDTO;
import com.syab.documentediting.dto.EditDocumentRequest;
import com.syab.documentediting.model.Document;
import com.syab.documentediting.model.DocumentChange;
import com.syab.documentediting.repository.DocumentChangeRepository;
import com.syab.documentediting.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CompletableFuture;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {
    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);
    private final DocumentRepository documentRepository;
    private final DocumentChangeRepository changeRepository;
    private final com.syab.documentediting.repository.DocumentShareRepository shareRepository;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final Map<SseEmitter, Long> emitterToUser = new ConcurrentHashMap<>();
    private final Map<Long, Set<Long>> onlineUsers = new ConcurrentHashMap<>();

    public DocumentService(DocumentRepository documentRepository, DocumentChangeRepository changeRepository, com.syab.documentediting.repository.DocumentShareRepository shareRepository) {
        this.documentRepository = documentRepository;
        this.changeRepository = changeRepository;
        this.shareRepository = shareRepository;
    }

    /**
     * Operation 1: Create a new document
     */
    public DocumentDTO createDocument(String title, Long ownerId) {
        Document document = new Document();
        document.setTitle(title);
        document.setContent("");
        document.setOwnerId(ownerId);
        document.setIsShared(false);

        Document savedDocument = documentRepository.save(document);
        return convertToDTO(savedDocument);
    }

    /**
     * Operation 2: Edit an existing document collaboratively and track changes
     */
    public DocumentDTO editDocument(Long documentId, Long userId, EditDocumentRequest request) {
        Optional<Document> documentOptional = documentRepository.findById(documentId);
        if (documentOptional.isEmpty()) {
            throw new IllegalArgumentException("Document not found");
        }

        Document document = documentOptional.get();
        
        // Update document content
        document.setContent(request.getContent());
        Document updatedDocument = documentRepository.save(document);

        // Track the change in real-time
        DocumentChange change = new DocumentChange();
        change.setDocumentId(documentId);
        change.setUserId(userId);
        change.setChangeContent(request.getContent());
        change.setOperationType(request.getOperationType());
        changeRepository.save(change);

        // broadcast the change to SSE subscribers
        broadcastDocumentChange(documentId, convertToDTO(updatedDocument), convertChangeToDTO(change));

        return convertToDTO(updatedDocument);
    }

    public SseEmitter subscribeToDocument(Long documentId, Long userId) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitters.computeIfAbsent(documentId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitterToUser.put(emitter, userId);
        onlineUsers.computeIfAbsent(documentId, k -> ConcurrentHashMap.newKeySet()).add(userId);
        // broadcast updated presence
        broadcastPresence(documentId);

        emitter.onCompletion(() -> removeEmitter(documentId, emitter));
        emitter.onTimeout(() -> removeEmitter(documentId, emitter));
        emitter.onError((e) -> removeEmitter(documentId, emitter));

        // Optionally, send a welcome event with current document state
        try {
            DocumentDTO doc = getDocument(documentId);
            emitter.send(SseEmitter.event().name("init").data(doc));
        } catch (Exception e) {
            // ignore
        }

        return emitter;
    }

    private void removeEmitter(Long documentId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(documentId);
        if (list != null) {
            list.remove(emitter);
        }
        Long uid = emitterToUser.remove(emitter);
        if (uid != null) {
            Set<Long> users = onlineUsers.get(documentId);
            if (users != null) {
                // Check if any other emitter remains for this same user
                boolean stillHasEmitter = false;
                List<SseEmitter> remaining = emitters.get(documentId);
                if (remaining != null && !remaining.isEmpty()) {
                    for (SseEmitter e : remaining) {
                        Long u = emitterToUser.get(e);
                        if (u != null && u.equals(uid)) {
                            stillHasEmitter = true;
                            break;
                        }
                    }
                }
                if (!stillHasEmitter) {
                    users.remove(uid);
                }
                // if no more online users, remove set
                if (users.isEmpty()) onlineUsers.remove(documentId);
            }
            broadcastPresence(documentId);
        }
    }

    private void broadcastPresence(Long documentId) {
        List<SseEmitter> list = emitters.get(documentId);
        if (list == null) return;
        Set<Long> users = onlineUsers.get(documentId);
        List<Long> userList = users == null ? List.of() : List.copyOf(users);

        for (SseEmitter emitter : list) {
            CompletableFuture.runAsync(() -> {
                try {
                    emitter.send(SseEmitter.event().name("presence").data(userList));
                } catch (Exception e) {
                    removeEmitter(documentId, emitter);
                }
            });
        }
    }

    private void broadcastDocumentChange(Long documentId, DocumentDTO documentDTO, DocumentChangeDTO changeDTO) {
        List<SseEmitter> list = emitters.get(documentId);
        if (list == null) return;

        for (SseEmitter emitter : list) {
            CompletableFuture.runAsync(() -> {
                try {
                    var payload = Map.of("document", documentDTO, "change", changeDTO);
                    emitter.send(SseEmitter.event().name("document").data(payload));
                } catch (Exception e) {
                    removeEmitter(documentId, emitter);
                }
            });
        }
    }

    /**
     * Operation 3: Track changes in real-time (Get all changes for a document)
     */
    public List<DocumentChangeDTO> getDocumentChanges(Long documentId) {
        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isEmpty()) {
            throw new IllegalArgumentException("Document not found");
        }

        List<DocumentChange> changes = changeRepository.findByDocumentId(documentId);
        return changes.stream().map(this::convertChangeToDTO).collect(Collectors.toList());
    }

    public DocumentDTO getDocument(Long documentId) {
        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isEmpty()) {
            throw new IllegalArgumentException("Document not found");
        }
        return convertToDTO(document.get());
    }

    public List<DocumentDTO> getUserDocuments(Long userId) {
        List<Document> documents = documentRepository.findByOwnerId(userId);
        return documents.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<DocumentDTO> getSharedDocuments(Long userId) {
        // Return documents that were explicitly shared with this user
        List<com.syab.documentediting.model.DocumentShare> shares = shareRepository.findByUserId(userId);
        if (shares == null || shares.isEmpty()) return List.of();
        List<Long> docIds = shares.stream().map(com.syab.documentediting.model.DocumentShare::getDocumentId).toList();
        List<com.syab.documentediting.model.Document> documents = documentRepository.findAllById(docIds);
        return documents.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public DocumentDTO inviteUserByEmail(Long documentId, String email, Long invitedBy) {
        Optional<com.syab.documentediting.model.Document> docOpt = documentRepository.findById(documentId);
        if (docOpt.isEmpty()) throw new IllegalArgumentException("Document not found");
        var doc = docOpt.get();
        // call user-management-service via gateway to find user by email
            try {
            org.springframework.web.client.RestTemplate rest = new org.springframework.web.client.RestTemplate();
            // call user-management service via gateway
            String url = String.format("http://localhost:8081/api/users/by-email?email=%s", email);
            log.debug("Inviting user by email - calling URL: {}", url);
            var resp = rest.getForEntity(url, java.util.Map.class);
            log.debug("Invite lookup GET returned status={}, body={}", resp.getStatusCode(), resp.getBody());
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                Object idObj = resp.getBody().get("id");
                Long userId = idObj == null ? null : Long.valueOf(String.valueOf(idObj));
                // create share record if not exists
                var existing = shareRepository.findByDocumentIdAndUserId(documentId, userId);
                if (existing.isEmpty()) {
                    com.syab.documentediting.model.DocumentShare share = new com.syab.documentediting.model.DocumentShare();
                    share.setDocumentId(documentId);
                    share.setUserId(userId);
                    share.setInvitedBy(invitedBy);
                    shareRepository.save(share);
                }
                // mark doc shared
                doc.setIsShared(true);
                documentRepository.save(doc);
                return convertToDTO(doc);
            } else {
                throw new IllegalArgumentException("No user with that email");
            }
        } catch (IllegalArgumentException e) {
            // user not found
            throw e;
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound nf) {
            // Log the status and response body so we can inspect what the user-management service returned
            try {
                log.debug("Invite lookup returned NotFound: status={}, body={}", nf.getStatusCode(), nf.getResponseBodyAsString());
            } catch (Exception logEx) {
                log.debug("Invite lookup NotFound (no response body available): {}", nf.getStatusCode());
            }
            throw new IllegalArgumentException("User not found (by email)");
        } catch (org.springframework.web.client.HttpClientErrorException hce) {
            // Log other client errors for easier diagnosis
            try {
                log.debug("Invite lookup client error: status={}, body={}", hce.getStatusCode(), hce.getResponseBodyAsString());
            } catch (Exception logEx) {
                log.debug("Invite lookup client error: {}", hce.getStatusCode());
            }
            throw new RuntimeException("Failed to invite user: " + hce.getMessage(), hce);
        } catch (Exception e) {
            // include cause message so frontend can show a helpful error
            String msg = e.getMessage() == null ? "Failed to invite user" : "Failed to invite user: " + e.getMessage();
            throw new RuntimeException(msg, e);
        }
    }

    private DocumentDTO convertToDTO(Document document) {
        return new DocumentDTO(
            document.getId(),
            document.getTitle(),
            document.getContent(),
            document.getOwnerId(),
            document.getIsShared(),
            document.getUpdatedAt() != null ? document.getUpdatedAt().toString() : null
        );
    }

    private DocumentChangeDTO convertChangeToDTO(DocumentChange change) {
        return new DocumentChangeDTO(change.getId(), change.getDocumentId(), change.getUserId(),
                change.getChangeContent(), change.getOperationType());
    }
}
