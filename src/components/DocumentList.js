import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import {
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getAll();
      if (response.data.success) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      setError('Failed to load documents');
      console.error('Load documents error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await documentsAPI.create({ title: newDocTitle });
      if (response.data.success) {
        navigate(`/documents/${response.data.document._id}`);
      }
    } catch (error) {
      setError('Failed to create document');
      console.error('Create document error:', error);
    } finally {
      setCreating(false);
      setCreateDialogOpen(false);
      setNewDocTitle('');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentsAPI.delete(id);
        loadDocuments();
      } catch (error) {
        setError('Failed to delete document');
        console.error('Delete error:', error);
      }
    }
  };

  const handleShare = async (id, e) => {
    e.stopPropagation();
    try {
      const response = await documentsAPI.share(id);
      if (response.data.success) {
        alert(`Share link: ${response.data.shareLink}`);
      }
    } catch (error) {
      setError('Failed to generate share link');
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Documents</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Document
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No documents yet. Create your first document!
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {documents.map((doc) => (
              <ListItem
                key={doc._id}
                button
                onClick={() => navigate(`/documents/${doc._id}`)}
                sx={{
                  borderBottom: '1px solid #e0e0e0',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                }}
              >
                <ListItemText
                  primary={doc.title}
                  secondary={`Last modified: ${new Date(doc.lastModified).toLocaleString()}`}
                />
                <Box>
                  {doc.owner._id === user?.id && (
                    <>
                      <IconButton
                        onClick={(e) => handleShare(doc._id, e)}
                        color="primary"
                        size="small"
                      >
                        <ShareIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => handleDelete(doc._id, e)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    onClick={() => navigate(`/documents/${doc._id}`)}
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            fullWidth
            variant="standard"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateDocument();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateDocument}
            variant="contained"
            disabled={creating || !newDocTitle.trim()}
          >
            {creating ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentList;

