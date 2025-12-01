import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Grid,
  Box,
  Alert,
  Skeleton,
  Fab,
  Tooltip,
  Chip,
  Paper,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  Badge,
  AvatarGroup,
  Avatar,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Person as PersonIcon,
  FileCopy as FileCopyIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/endpoints";
import { documentAPI } from "../../services/endpoints";

const DocumentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [ownerProfiles, setOwnerProfiles] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [sortBy, setSortBy] = useState("updated");
  const [filterType, setFilterType] = useState("all");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [ownedResp, sharedResp] = await Promise.all([
        documentAPI.getUserDocuments(user.id),
        documentAPI.getSharedDocuments(user.id),
      ]);
      const ownedDocs = ownedResp.data || [];
      const sharedDocs = sharedResp.data || [];
      const map = new Map();
      ownedDocs.forEach((d) => map.set(d.id, d));
      sharedDocs.forEach((d) => {
        if (!map.has(d.id)) map.set(d.id, d);
      });
      setDocuments(Array.from(map.values()));
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const ownerIds = Array.from(
      new Set(
        documents
          .filter((d) => d.isShared && d.ownerId !== user.id)
          .map((d) => d.ownerId)
      )
    );
    if (ownerIds.length === 0) return;
    let isMounted = true;
    Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const resp = await authAPI.getProfile(ownerId);
          return [ownerId, resp.data];
        } catch (err) {
          return [ownerId, null];
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      const map = { ...ownerProfiles };
      results.forEach(([ownerId, profile]) => {
        if (profile) map[ownerId] = profile;
      });
      setOwnerProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [documents, user.id]);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      setError("Please enter a document title");
      return;
    }

    try {
      const response = await documentAPI.createDocument(newDocTitle, user.id);
      setNewDocTitle("");
      navigate(`/documents/${response.data.id}/edit`);
    } catch {
      setError("Failed to create document");
    }
  };

  const handleShareDocument = async (docId, e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/documents/${docId}/edit`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Document link copied to clipboard!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Document link copied to clipboard!");
    }
  };

  const getPreview = (text, maxChars = 45) => {
    if (!text) return "No content yet...";
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length <= maxChars
      ? cleaned
      : cleaned.substring(0, maxChars) + "...";
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" ? true :
                         filterType === "owned" ? doc.ownerId === user.id :
                         filterType === "shared" && doc.isShared && doc.ownerId !== user.id;
    return matchesSearch && matchesFilter;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortBy === "updated") {
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    } else if (sortBy === "created") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              Documents
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Create, collaborate, and share documents in real-time
            </Typography>
          </Box>
          <Avatar
            sx={{ 
              width: 56, 
              height: 56, 
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: '1.5rem',
              fontWeight: 600
            }}
          >
            {user?.firstName?.[0] || user?.username?.[0] || 'U'}
          </Avatar>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {documents.length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total Documents
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {documents.filter(d => d.ownerId === user.id).length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Created by You
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {documents.filter(d => d.isShared && d.ownerId !== user.id).length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Shared with You
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Toolbar Section */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Search */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />

          {/* Filter & Sort */}
          <Box sx={{ display: 'flex', gap: 2, minWidth: { md: 300 } }}>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              {filterType === 'all' ? 'All Docs' : 
               filterType === 'owned' ? 'My Docs' : 'Shared'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SortIcon />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              Sort
            </Button>
          </Box>
        </Box>

        {/* Create Document Section */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="New document title..."
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDocument}
            disabled={!newDocTitle.trim()}
            sx={{ 
              minWidth: 140, 
              height: 56,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              }
            }}
          >
            Create
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Documents Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2 }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width={80} height={36} />
                  <Skeleton variant="rectangular" width={80} height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : sortedDocuments.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
            No documents found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Try a different search term' : 'Create your first document to get started'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDocument}
            sx={{ borderRadius: 2 }}
          >
            Create First Document
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {sortedDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8,
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 2, 
                        bgcolor: 'primary.light', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <DescriptionIcon sx={{ color: 'primary.main' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {doc.title}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnchorEl(e.currentTarget);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {getPreview(doc.content, 80)}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {doc.isShared && doc.ownerId !== user.id && (
                        <Chip
                          label="Shared"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {doc.updatedAt && new Date(doc.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                      {[...Array(3)].map((_, i) => (
                        <Avatar key={i} sx={{ bgcolor: 'primary.light' }}>
                          <PersonIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/documents/${doc.id}/edit`);
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        <EditIcon fontSize="small" />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Share">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => handleShareDocument(doc.id, e)}
                        sx={{ borderRadius: 2 }}
                      >
                        <ShareIcon fontSize="small" />
                      </Button>
                    </Tooltip>
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<HistoryIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/documents/${doc.id}/versions`);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    History
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        PaperProps={{
          sx: { borderRadius: 2, mt: 1 }
        }}
      >
        <MenuItem onClick={() => { setFilterType('all'); setFilterAnchorEl(null); }}>
          All Documents
        </MenuItem>
        <MenuItem onClick={() => { setFilterType('owned'); setFilterAnchorEl(null); }}>
          My Documents
        </MenuItem>
        <MenuItem onClick={() => { setFilterType('shared'); setFilterAnchorEl(null); }}>
          Shared with Me
        </MenuItem>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { borderRadius: 2, mt: 1 }
        }}
      >
        <MenuItem onClick={() => { setSortBy('updated'); setAnchorEl(null); }}>
          Sort by Last Updated
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('created'); setAnchorEl(null); }}>
          Sort by Created Date
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('title'); setAnchorEl(null); }}>
          Sort by Title
        </MenuItem>
      </Menu>

      {/* Floating Action Button */}
      <Tooltip title="Create New Document">
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            }
          }}
          onClick={() => {
            const title = prompt("Enter document title:");
            if (title?.trim()) {
              setNewDocTitle(title.trim());
              handleCreateDocument();
            }
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Container>
  );
};

export default DocumentList;