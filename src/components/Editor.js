import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { documentsAPI, aiAPI } from '../services/api';
import { documentEvents, getSocket } from '../services/socket';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  MoreVert as MoreVertIcon,
  AutoFixHigh as AIIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiFeature, setAiFeature] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const quillRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    loadDocument();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (socket && id) {
        documentEvents.leaveDocument(id);
      }
    };
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;

    // Join document room
    documentEvents.joinDocument(id);

    // Set up event listeners
    documentEvents.onTextChange(handleRemoteTextChange);
    documentEvents.onCursorMove(handleCursorMove);
    documentEvents.onUserJoined(handleUserJoined);
    documentEvents.onUserLeft(handleUserLeft);
    documentEvents.onActiveUsers(handleActiveUsers);
    documentEvents.onDocumentSaved(handleDocumentSaved);
    documentEvents.onSaveSuccess(handleSaveSuccess);
    documentEvents.onError(handleSocketError);

    return () => {
      documentEvents.offTextChange();
      documentEvents.offCursorMove();
      documentEvents.offUserJoined();
      documentEvents.offUserLeft();
      documentEvents.offActiveUsers();
      documentEvents.offDocumentSaved();
      documentEvents.offSaveSuccess();
      documentEvents.offError();
    };
  }, [socket, id]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (content && id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 30000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getById(id);
      if (response.data.success) {
        const doc = response.data.document;
        setDocument(doc);
        setContent(doc.content || '');
      }
    } catch (error) {
      setError('Failed to load document');
      console.error('Load document error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (manual = false) => {
    if (!id || saving) return;

    try {
      setSaving(true);
      const response = await documentsAPI.update(id, { content });
      if (response.data.success) {
        if (socket) {
          documentEvents.saveDocument(id, content);
        }
        if (manual) {
          setError('');
        }
      }
    } catch (error) {
      setError('Failed to save document');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTextChange = (value, delta, source) => {
    if (source === 'user') {
      setContent(value);
      const htmlContent = value;
      
      if (socket && id) {
        documentEvents.sendTextChange(id, delta, htmlContent);
      }
    }
  };

  const handleRemoteTextChange = useCallback((data) => {
    if (data.userId !== user?.id && quillRef.current) {
      const editor = quillRef.current.getEditor();
      const currentContent = editor.root.innerHTML;
      
      // Only apply if content is different
      if (data.content !== currentContent) {
        editor.updateContents(data.delta, 'api');
      }
    }
  }, [user]);

  const handleCursorMove = useCallback((data) => {
    // Could implement cursor position display here
    console.log('Cursor moved:', data);
  }, []);

  const handleUserJoined = useCallback((data) => {
    setActiveUsers((prev) => {
      if (!prev.find((u) => u.id === data.user.id)) {
        return [...prev, data.user];
      }
      return prev;
    });
  }, []);

  const handleUserLeft = useCallback((data) => {
    setActiveUsers((prev) => prev.filter((u) => u.id !== data.user.id));
  }, []);

  const handleActiveUsers = useCallback((data) => {
    setActiveUsers(data.users);
  }, []);

  const handleDocumentSaved = useCallback((data) => {
    console.log('Document saved by:', data.savedBy);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    console.log('Save successful');
  }, []);

  const handleSocketError = useCallback((data) => {
    setError(data.message || 'Socket error');
  }, []);

  const handleAIFeature = async (feature) => {
    if (!content.trim()) {
      setError('Please add some content first');
      return;
    }

    setAiFeature(feature);
    setAiDialogOpen(true);
    setAiResult(null);
    setAiLoading(true);

    try {
      let response;
      const selectedText = quillRef.current?.getEditor().getText() || content;

      switch (feature) {
        case 'grammar':
          response = await aiAPI.grammarCheck(selectedText);
          break;
        case 'enhance':
          response = await aiAPI.enhance(selectedText);
          break;
        case 'summarize':
          response = await aiAPI.summarize(selectedText);
          break;
        case 'suggestions':
          response = await aiAPI.suggestions(selectedText);
          break;
        default:
          return;
      }

      if (response.data.success) {
        setAiResult(response.data.result || response.data.suggestions);
      }
    } catch (error) {
      setError('AI request failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIResult = () => {
    if (aiFeature === 'enhance' && aiResult?.enhancedText && quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.clipboard.dangerouslyPasteHTML(aiResult.enhancedText);
      setContent(aiResult.enhancedText);
    }
    setAiDialogOpen(false);
    setAiResult(null);
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

  if (!document) {
    return (
      <Container>
        <Alert severity="error">Document not found</Alert>
      </Container>
    );
  }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default">
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/documents')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {document.title}
          </Typography>
          {activeUsers.map((u) => (
            <Chip
              key={u.id}
              label={u.username}
              size="small"
              sx={{ mr: 1 }}
              color={u.id === user?.id ? 'primary' : 'default'}
            />
          ))}
          <Button
            startIcon={<AIIcon />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ mr: 1 }}
          >
            AI Assistant
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => { setAnchorEl(null); handleAIFeature('grammar'); }}>
              Grammar Check
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleAIFeature('enhance'); }}>
              Enhance Text
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleAIFeature('summarize'); }}>
              Summarize
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleAIFeature('suggestions'); }}>
              Writing Suggestions
            </MenuItem>
          </Menu>
          <Button
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={() => handleSave(true)}
            disabled={saving}
            variant="contained"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleTextChange}
          modules={modules}
          style={{ height: 'calc(100vh - 200px)' }}
        />
      </Box>

      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          AI Assistant - {aiFeature === 'grammar' && 'Grammar Check'}
          {aiFeature === 'enhance' && 'Text Enhancement'}
          {aiFeature === 'summarize' && 'Summarization'}
          {aiFeature === 'suggestions' && 'Writing Suggestions'}
        </DialogTitle>
        <DialogContent>
          {aiLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : aiResult ? (
            <Box>
              {aiFeature === 'grammar' && (
                <Box>
                  <Typography variant="h6">Overall Score: {aiResult.overallScore || 'N/A'}</Typography>
                  {aiResult.errors && aiResult.errors.length > 0 ? (
                    <List>
                      {aiResult.errors.map((error, idx) => (
                        <ListItem key={idx}>
                          <ListItemText
                            primary={error.message}
                            secondary={`Suggestion: ${error.suggestion}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography>No errors found!</Typography>
                  )}
                </Box>
              )}
              {aiFeature === 'enhance' && (
                <Box>
                  <Typography variant="h6">Enhanced Text:</Typography>
                  <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                    <div dangerouslySetInnerHTML={{ __html: aiResult.enhancedText }} />
                  </Paper>
                  {aiResult.changes && (
                    <Box mt={2}>
                      <Typography variant="h6">Key Changes:</Typography>
                      <List>
                        {aiResult.changes.map((change, idx) => (
                          <ListItem key={idx}>
                            <ListItemText primary={change} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
              {aiFeature === 'summarize' && (
                <Box>
                  <Typography variant="h6">Summary:</Typography>
                  <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                    <Typography>{aiResult.summary || aiResult}</Typography>
                  </Paper>
                </Box>
              )}
              {aiFeature === 'suggestions' && (
                <Box>
                  <Typography variant="h6">Suggestions:</Typography>
                  <List>
                    {(Array.isArray(aiResult) ? aiResult : [aiResult]).map((suggestion, idx) => (
                      <ListItem key={idx}>
                        <ListItemText primary={suggestion} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {aiFeature === 'enhance' && aiResult && (
            <Button onClick={applyAIResult} variant="contained" startIcon={<CheckIcon />}>
              Apply Enhancement
            </Button>
          )}
          <Button onClick={() => setAiDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Editor;

