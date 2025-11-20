import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { documentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ShareAccess = () => {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState('loading'); // loading, success, error, login
  const [message, setMessage] = useState('Granting you access to the document...');
  const [documentId, setDocumentId] = useState(null);

  useEffect(() => {
    const acceptShare = async () => {
      if (!isAuthenticated) {
        setStatus('login');
        setMessage('Please log in to access the shared document.');
        return;
      }

      try {
        setStatus('loading');
        setMessage('Granting you access to the document...');
        const response = await documentsAPI.acceptShare(shareLink);

        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message);
          setDocumentId(response.data.documentId);

          setTimeout(() => {
            navigate(`/documents/${response.data.documentId}`);
          }, 1500);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Failed to access document.');
        }
      } catch (error) {
        console.error('Accept share error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to access document.');
      }
    };

    acceptShare();
  }, [shareLink, isAuthenticated, navigate]);

  const handleLogin = () => {
    navigate('/login', { state: { from: `/share/${shareLink}` } });
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', width: '100%' }} elevation={3}>
          <Typography variant="h5" gutterBottom>
            Accessing Shared Document
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Share Link: {shareLink}
          </Typography>

          {status === 'loading' && (
            <Box>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>{message}</Typography>
            </Box>
          )}

          {status === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          {status === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          {status === 'login' && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Button variant="contained" onClick={handleLogin}>
                Login to Continue
              </Button>
            </Box>
          )}

          {documentId && (
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              onClick={() => navigate(`/documents/${documentId}`)}
            >
              Go to Document
            </Button>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ShareAccess;

