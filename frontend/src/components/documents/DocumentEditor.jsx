import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Avatar,
  Tooltip,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Badge,
  AvatarGroup,
} from "@mui/material";
import {
  Share as ShareIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  PersonAdd as PersonAddIcon,
  ContentCopy as ContentCopyIcon,
  CloudUpload as CloudUploadIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useDocuments, useDocumentWs } from "../../context/DocumentContext";
import { documentAPI, versionAPI, authAPI } from "../../services/endpoints";
import "../styles/DocumentEditor.css";

const DocumentEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    subscribeToDocument,
    unsubscribeFromDocument,
    liveUsers,
    onlineUsers,
    lastChange,
  } = useDocuments();
  const { wsSendEdit, wsConnected, wsLastError } = useDocumentWs();

  const [doc, setDoc] = useState(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const autoSaveTimerRef = useRef(null);
  const [error, setError] = useState("");
  const [lastFetchedContent, setLastFetchedContent] = useState("");
  const [remoteChangeDetected, setRemoteChangeDetected] = useState(false);
  const [remoteContent, setRemoteContent] = useState("");
  const [remoteChangeAuthor, setRemoteChangeAuthor] = useState(null);
  const [remoteChangeIsMine, setRemoteChangeIsMine] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);

  const contentRef = useRef(content);
  const wsTimerRef = useRef(null);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setError("Document content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await documentAPI.editDocument(id, user.id, content, "UPDATE");
      try {
        wsSendEdit(Number(id), user.id, content, "UPDATE");
      } catch (e) {
        void e;
      }
      setLastFetchedContent(content);
    } catch {
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  }, [id, user?.id, content, wsSendEdit]);

  useEffect(() => {
    contentRef.current = content;
    if (autoSaveEnabled) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        if (!isSaving && contentRef.current.trim()) {
          await handleSave();
        }
      }, 2000);
    } else if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [content, autoSaveEnabled, handleSave, isSaving]);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await documentAPI.getDocument(id);
        setDoc(response.data);
        setContent(response.data.content || "");
        setLastFetchedContent(response.data.content || "");
      } catch {
        setError("Failed to load document");
      }
    };

    if (id) {
      fetchDocument();
      if (user) subscribeToDocument(id);
    }
    return () => unsubscribeFromDocument();
  }, [id, user, subscribeToDocument, unsubscribeFromDocument]);

  useEffect(() => {
    if (!lastChange) return;
    (async () => {
      try {
        const payload = lastChange;
        const serverContent = payload?.document?.content || "";
        const change = payload?.change;
        if (serverContent !== lastFetchedContent) {
          if (payload.document) setDoc(payload.document);
          if (contentRef.current === lastFetchedContent) {
            setContent(serverContent);
            setLastFetchedContent(serverContent);
          } else {
            const isMine = String(change?.userId) === String(user?.id);
            setRemoteChangeIsMine(isMine);
            setRemoteChangeDetected(!isMine);
            setRemoteContent(serverContent);
            let author =
              liveUsers.find((u) => u.id === change?.userId) ||
              onlineUsers.find((u) => u.id === change?.userId) ||
              null;
            if (!author && change?.userId) {
              try {
                const aresp = await authAPI.getProfile(change.userId);
                author = aresp.data;
              } catch {
                // ignore
              }
            }
            setRemoteChangeAuthor(author);
            if (isMine) {
              setLastFetchedContent(serverContent);
            }
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [lastChange, lastFetchedContent, liveUsers, onlineUsers, user?.id]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  const handleCreateVersion = async () => {
    try {
      await versionAPI.createVersion(
        id,
        user.id,
        content,
        `Version at ${new Date().toLocaleTimeString()}`
      );
      alert("Version created successfully!");
      navigate(`/documents/${id}/versions`);
    } catch {
      setError("Failed to create version");
    }
  };

  const handleShareDocument = async () => {
    const shareUrl = `${window.location.origin}/documents/${id}/edit`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Document link copied to clipboard!");
    } catch {
      const textArea = window.document.createElement("textarea");
      textArea.value = shareUrl;
      window.document.body.appendChild(textArea);
      textArea.select();
      window.document.execCommand("copy");
      window.document.body.removeChild(textArea);
      alert("Document link copied to clipboard!");
    }
  };

  const getOnlineUsers = () => {
    const others = onlineUsers.filter((u) => u.id !== user?.id);
    const currentUser = user ? { ...user, isCurrent: true } : null;
    return currentUser ? [...others, currentUser] : others;
  };

  return (
    <div className="document-editor">
      {/* Enhanced Header */}
      <Paper 
        elevation={1}
        sx={{ 
          p: 2.5, 
          mb: 3, 
          borderRadius: 3,
          borderLeft: '4px solid',
          borderColor: 'primary.main',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/documents")}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Back
            </Button>
            
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {doc?.title || "Untitled Document"}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={`ID: ${id}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Last saved: {lastFetchedContent === content ? "Now" : doc?.updatedAt ? new Date(doc.updatedAt).toLocaleTimeString() : "Never"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge
                variant="dot"
                color={wsConnected ? "success" : "error"}
                sx={{ mr: 1 }}
              >
                <Typography variant="caption" color="text.secondary">
                  {wsConnected ? "Live" : "Offline"}
                </Typography>
              </Badge>
              
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
                {getOnlineUsers().map((u) => (
                  <Tooltip 
                    key={u.id} 
                    title={u.isCurrent ? `${u.username} (You)` : u.username}
                  >
                    <Avatar
                      sx={{ 
                        bgcolor: u.isCurrent ? 'primary.main' : 'secondary.main',
                        fontSize: 14,
                        border: u.isCurrent ? '2px solid white' : 'none'
                      }}
                    >
                      {u.username?.[0]?.toUpperCase() || '?'}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            </Box>

            <IconButton onClick={(e) => setMoreMenuAnchor(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Action Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-save"
              sx={{ m: 0 }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Share Document">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={handleShareDocument}
                  sx={{ borderRadius: 2 }}
                >
                  Share
                </Button>
              </Tooltip>
              
              <Tooltip title="Invite Collaborator">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={async () => {
                    const email = prompt("Invite collaborator by email:");
                    if (!email) return;
                    try {
                      await documentAPI.inviteUser(id, email, user?.id);
                      alert("Invitation sent and document shared with " + email);
                    } catch (err) {
                      const msg =
                        err?.response?.data ||
                        err?.message ||
                        "Failed to invite user.";
                      alert(msg);
                    }
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Invite
                </Button>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={handleCreateVersion}
              sx={{ borderRadius: 2 }}
            >
              Create Version
            </Button>
            
            <Button
              variant="contained"
              startIcon={isSaving ? <CloudUploadIcon /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
              sx={{ 
                borderRadius: 2,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                }
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error & Remote Update Banners */}
      {error && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 2,
            bgcolor: 'error.light',
            color: 'error.contrastText'
          }}
        >
          <Typography variant="body2">{error}</Typography>
        </Paper>
      )}

      {remoteChangeDetected && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 2,
            bgcolor: 'warning.light',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
              {remoteChangeAuthor?.username?.[0] || '?'}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {remoteChangeIsMine ? "Your changes were saved" : "Remote changes detected"}
              </Typography>
              <Typography variant="caption">
                {remoteChangeAuthor && `by ${remoteChangeAuthor.username}`}
              </Typography>
            </Box>
          </Box>
          
          {!remoteChangeIsMine && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setContent(remoteContent);
                  setLastFetchedContent(remoteContent);
                  setRemoteChangeDetected(false);
                }}
                sx={{ borderRadius: 1 }}
              >
                Apply
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setRemoteChangeDetected(false)}
                sx={{ borderRadius: 1 }}
              >
                Ignore
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => {
          const val = e.target.value;
          setContent(val);
          if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
          wsTimerRef.current = setTimeout(() => {
            try {
              wsSendEdit(Number(id), user.id, val, "UPDATE");
            } catch (e) {
              void e;
            }
          }, 600);
        }}
        placeholder="Start typing your document here..."
        className="editor-textarea"
        style={{
          borderRadius: '12px',
          padding: '24px',
          fontSize: '16px',
          lineHeight: '1.8',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      />

      {/* More Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => setMoreMenuAnchor(null)}
        PaperProps={{
          sx: { borderRadius: 2, mt: 1, minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => { navigate(`/documents/${id}/versions`); setMoreMenuAnchor(null); }}>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
          Version History
        </MenuItem>
        <MenuItem onClick={() => { handleShareDocument(); setMoreMenuAnchor(null); }}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          Share Link
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleCreateVersion(); setMoreMenuAnchor(null); }}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Create Copy
        </MenuItem>
        <MenuItem onClick={() => { 
          if (window.confirm("Are you sure you want to delete this document?")) {
            // Add delete logic here
          }
          setMoreMenuAnchor(null);
        }}>
          <Typography color="error">
            Delete Document
          </Typography>
        </MenuItem>
      </Menu>

      {/* Status Bar */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Characters: {content.length} | Words: {content.split(/\s+/).filter(Boolean).length}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {wsConnected ? "Connected to real-time server" : "Using server-sent events"}
        </Typography>
      </Box>
    </div>
  );
};

export default DocumentEditor;