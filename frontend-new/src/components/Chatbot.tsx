import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // Import createPortal
import { Box, Button, TextField, Typography, IconButton, Paper } from '@mui/material';
import { Chat, Close, Send, Fullscreen, FullscreenExit, Delete } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import Draggable from 'react-draggable';
import { sendChatbotMessage } from '../utils/api';

interface ChatbotProps {
  apiKey: string;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ apiKey }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const savedMessages = localStorage.getItem('chatbotMessages');
    return savedMessages
      ? JSON.parse(savedMessages)
      : [
          {
            sender: 'bot',
            text: "Hello! I'm here to help you find and download models. How can I assist you today?",
          },
        ];
  });
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [debug, setDebug] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Viewport and layout dimensions
  const [viewportWidth, setViewportWidth] = useState<number>(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  const [sidebarWidth, setSidebarWidth] = useState<number>(0); // Default to 0px
  const [headerHeight, setHeaderHeight] = useState<number>(0); // Default to 0px
  const [footerHeight, setFooterHeight] = useState<number>(0); // Default to 0px

  useEffect(() => {
    const updateDimensions = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);

      const sidebar = document.querySelector('.sidebar');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');

      if (sidebar) {
        const width = (sidebar as HTMLElement).offsetWidth > 0 && (sidebar as HTMLElement).offsetHeight > 0 ? sidebar.getBoundingClientRect().width : 0;
        setSidebarWidth(width);
      }
      if (header) {
        const height = header.offsetHeight > 0 ? header.getBoundingClientRect().height : 0;
        setHeaderHeight(height);
      }
      if (footer) {
        const height = footer.offsetHeight > 0 ? footer.getBoundingClientRect().height : 0;
        setFooterHeight(height);
      }
    };

    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    const observer = new MutationObserver(updateDimensions);
    if (sidebar) observer.observe(sidebar, { attributes: true, childList: true, subtree: true });
    if (header) observer.observe(header, { attributes: true, childList: true, subtree: true });
    if (footer) observer.observe(footer, { attributes: true, childList: true, subtree: true });

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.setItem('chatbotMessages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      setMessages([
        ...messages,
        { sender: 'bot', text: 'Please enter an API key to use the chatbot.' },
      ]);
      return;
    }

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatbotMessage(input, apiKey, 'gemini');
      const botMessage: ChatMessage = { sender: 'bot', text: response.response };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const botMessage: ChatMessage = {
        sender: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, botMessage]);
      console.error(error);
    }
    setLoading(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: "Hello! I'm here to help you find and download models. How can I assist you today?",
      },
    ]);
  };

  // Simplified dimensions
  const padding = 20;
  const isSmallScreen = viewportWidth <= 600;
  const maxChatbotWidth = Math.min(viewportWidth - 2 * padding, 400); // Cap at 400px for small version
  const maxChatbotHeight = Math.min(viewportHeight - 2 * padding, 500); // Cap at 500px for small version
  const availableWidth = viewportWidth - sidebarWidth - 2 * padding;
  const availableHeight = viewportHeight - headerHeight - footerHeight - 2 * padding;

  // Ensure the small version fits within the viewport
  const smallWidth = Math.min(maxChatbotWidth, viewportWidth - 2 * padding);
  const smallHeight = Math.min(maxChatbotHeight, viewportHeight - 2 * padding);

  return createPortal(
    <Box sx={{ zIndex: 1000 }}>
      {/* Debug Overlay */}
      {debug && (
        <Box
          sx={{
            position: 'fixed',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            p: 1,
            borderRadius: '4px',
            zIndex: 3000,
          }}
        >
          <Typography variant="body2">
            Viewport: {viewportWidth}x{viewportHeight}
          </Typography>
          <Typography variant="body2">Sidebar Width: {sidebarWidth}px</Typography>
          <Typography variant="body2">Header Height: {headerHeight}px</Typography>
          <Typography variant="body2">Footer Height: {footerHeight}px</Typography>
          <Typography variant="body2">
            Small: {smallWidth}x{smallHeight}
          </Typography>
          <Typography variant="body2">
            Maximized: {availableWidth}x{availableHeight}
          </Typography>
        </Box>
      )}

      {!isOpen && (
        <IconButton
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: padding,
            right: padding,
            backgroundColor: '#5B21B6',
            color: '#fff',
            '&:hover': { backgroundColor: '#8B5CF6' },
            width: 60,
            height: 60,
            zIndex: 1000,
          }}
        >
          <Chat fontSize="large" />
        </IconButton>
      )}
      {isOpen && (
        <Draggable disabled={!isMaximized}>
          <Paper
            elevation={3}
            sx={{
              width: isMaximized
                ? isSmallScreen
                  ? '100vw'
                  : Math.min(availableWidth, viewportWidth - 2 * padding)
                : smallWidth,
              height: isMaximized
                ? isSmallScreen
                  ? '100vh'
                  : Math.min(availableHeight, viewportHeight - 2 * padding)
                : smallHeight,
              maxWidth: isMaximized ? viewportWidth - 2 * padding : smallWidth,
              maxHeight: isMaximized ? viewportHeight - 2 * padding : smallHeight,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1F2937',
              color: '#E2E8F0',
              borderRadius: '8px',
              position: 'fixed',
              bottom: isMaximized ? (isSmallScreen ? 0 : padding) : padding,
              right: isMaximized ? (isSmallScreen ? 0 : padding) : padding,
              top: isMaximized ? (isSmallScreen ? 0 : padding) : 'auto',
              left: isMaximized ? (isSmallScreen ? 0 : padding) : 'auto',
              zIndex: isMaximized ? 2000 : 1000,
              boxSizing: 'border-box',
              minWidth: { xs: 300, sm: 350 },
              paddingTop: isMaximized ? 'env(safe-area-inset-top)' : 0,
              paddingBottom: isMaximized ? 'env(safe-area-inset-bottom)' : 0,
              paddingLeft: isMaximized ? 'env(safe-area-inset-left)' : 0,
              paddingRight: isMaximized ? 'env(safe-area-inset-right)' : 0,
              boxShadow: isMaximized ? '0 0 20px rgba(0, 0, 0, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: '#111827',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              <Typography variant="h6">Model Search Assistant</Typography>
              <Box>
                <IconButton onClick={() => setDebug(!debug)} sx={{ color: '#E2E8F0' }}>
                  <Typography variant="body2">D</Typography>
                </IconButton>
                <IconButton onClick={handleClearChat} sx={{ color: '#E2E8F0' }}>
                  <Delete />
                </IconButton>
                <IconButton
                  onClick={() => setIsMaximized(!isMaximized)}
                  sx={{ color: '#E2E8F0' }}
                >
                  {isMaximized ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
                <IconButton onClick={() => setIsOpen(false)} sx={{ color: '#E2E8F0' }}>
                  <Close />
                </IconButton>
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                p: 2,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.sender === 'user' ? '#5B21B6' : '#374151',
                    color: '#E2E8F0',
                    p: 1,
                    borderRadius: '8px',
                    maxWidth: '80%',
                  }}
                >
                  {msg.sender === 'bot' ? (
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => (
                          <Typography variant="body2" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul style={{ paddingLeft: '20px' }} {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol style={{ paddingLeft: '20px' }} {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <Typography component="li" variant="body2" {...props} />
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    <Typography variant="body2">{msg.text}</Typography>
                  )}
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
              <TextField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                fullWidth
                variant="outlined"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#4B5563' },
                    '&:hover fieldset': { borderColor: '#5B21B6' },
                    '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
                    backgroundColor: '#374151',
                    color: '#E2E8F0',
                  },
                  '& .MuiInputBase-input': { color: '#E2E8F0' },
                }}
              />
              <IconButton
                onClick={handleSendMessage}
                disabled={loading}
                sx={{ color: '#5B21B6', '&:hover': { color: '#8B5CF6' } }}
              >
                <Send />
              </IconButton>
            </Box>
          </Paper>
        </Draggable>
      )}
    </Box>,
    document.body // Render at the root of the DOM
  );
};

export default Chatbot;