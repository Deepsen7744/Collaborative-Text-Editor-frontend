import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  return socket;
};

// Document collaboration events
export const documentEvents = {
  joinDocument: (documentId) => {
    if (socket) {
      socket.emit('join-document', { documentId });
    }
  },
  leaveDocument: (documentId) => {
    if (socket) {
      socket.emit('leave-document', { documentId });
    }
  },
  sendTextChange: (documentId, delta, content) => {
    if (socket) {
      socket.emit('text-change', { documentId, delta, content });
    }
  },
  sendCursorMove: (documentId, position, selection) => {
    if (socket) {
      socket.emit('cursor-move', { documentId, position, selection });
    }
  },
  saveDocument: (documentId, content) => {
    if (socket) {
      socket.emit('document-save', { documentId, content });
    }
  },
  onTextChange: (callback) => {
    if (socket) {
      socket.on('text-change', callback);
    }
  },
  offTextChange: () => {
    if (socket) {
      socket.off('text-change');
    }
  },
  onCursorMove: (callback) => {
    if (socket) {
      socket.on('cursor-move', callback);
    }
  },
  offCursorMove: () => {
    if (socket) {
      socket.off('cursor-move');
    }
  },
  onUserJoined: (callback) => {
    if (socket) {
      socket.on('user-joined', callback);
    }
  },
  offUserJoined: () => {
    if (socket) {
      socket.off('user-joined');
    }
  },
  onUserLeft: (callback) => {
    if (socket) {
      socket.on('user-left', callback);
    }
  },
  offUserLeft: () => {
    if (socket) {
      socket.off('user-left');
    }
  },
  onActiveUsers: (callback) => {
    if (socket) {
      socket.on('active-users', callback);
    }
  },
  offActiveUsers: () => {
    if (socket) {
      socket.off('active-users');
    }
  },
  onDocumentSaved: (callback) => {
    if (socket) {
      socket.on('document-saved', callback);
    }
  },
  offDocumentSaved: () => {
    if (socket) {
      socket.off('document-saved');
    }
  },
  onSaveSuccess: (callback) => {
    if (socket) {
      socket.on('save-success', callback);
    }
  },
  offSaveSuccess: () => {
    if (socket) {
      socket.off('save-success');
    }
  },
  onError: (callback) => {
    if (socket) {
      socket.on('error', callback);
    }
  },
  offError: () => {
    if (socket) {
      socket.off('error');
    }
  },
};

export default socket;

