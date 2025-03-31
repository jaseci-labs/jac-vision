import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
} from '@mui/material';
import { Chat, Close, Fullscreen, FullscreenExit, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: "Hello! I'm here to help you find and download models. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Preference states aligned with backend ChatbotRequest
  const [taskType, setTaskType] = useState<string>('general');
  const [paramRangeMin, setParamRangeMin] = useState<number>(3.0);
  const [paramRangeMax, setParamRangeMax] = useState<number>(7.0);
  const [hardwareGpuMemory, setHardwareGpuMemory] = useState<number | null>(null);
  const [preference, setPreference] = useState<string | null>(null);

  // Handle viewport and layout
  const [viewportWidth, setViewportWidth] = useState<number>(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);

  useEffect(() => {
    const updateDimensions = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      setMessages([...messages, { sender: 'bot', text: 'Please provide a message.' }]);
      return;
    }
    if (!apiKey) {
      setMessages([...messages, { sender: 'bot', text: 'Please enter an API key to use the chatbot.' }]);
      return;
    }

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatbotMessage(
        input,
        apiKey,
        taskType,
        paramRangeMin,
        paramRangeMax,
        hardwareGpuMemory,
        preference
      );
      setMessages((prev) => [...prev, { sender: 'bot', text: response.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' },
      ]);
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

  const padding = 20;
  const smallWidth = Math.min(400, viewportWidth - 2 * padding);
  const smallHeight = Math.min(500, viewportHeight - 2 * padding);

  return createPortal(
    <Box sx={{ zIndex: 1000 }}>
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
              width: isMaximized ? '90vw' : smallWidth,
              height: isMaximized ? '90vh' : smallHeight,
              maxWidth: viewportWidth - 2 * padding,
              maxHeight: viewportHeight - 2 * padding,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1F2937',
              color: '#E2E8F0',
              borderRadius: '8px',
              position: 'fixed',
              bottom: padding,
              right: padding,
              zIndex: 1000,
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: '#111827',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
              }}
            >
              <Typography variant="h6">Model Search Assistant</Typography>
              <Box>
                <IconButton onClick={handleClearChat} sx={{ color: '#E2E8F0' }}>
                  <Delete />
                </IconButton>
                <IconButton onClick={() => setIsMaximized(!isMaximized)} sx={{ color: '#E2E8F0' }}>
                  {isMaximized ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
                <IconButton onClick={() => setIsOpen(false)} sx={{ color: '#E2E8F0' }}>
                  <Close />
                </IconButton>
              </Box>
            </Box>
            {/* Chat Messages */}
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
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            {/* Message Input */}
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
                    backgroundColor: '#374151',
                    color: '#E2E8F0',
                    '& fieldset': { borderColor: '#4B5563' },
                    '&:hover fieldset': { borderColor: '#5B21B6' },
                    '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
                  },
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading}
                variant="contained"
                sx={{ backgroundColor: '#5B21B6', '&:hover': { backgroundColor: '#8B5CF6' } }}
              >
                Send
              </Button>
            </Box>
            {/* Preferences (Collapsible) */}
            <Box sx={{ p: 2, borderTop: '1px solid #374151' }}>
              <Button
                onClick={() => setShowPreferences(!showPreferences)}
                endIcon={showPreferences ? <ExpandLess /> : <ExpandMore />}
                sx={{ color: '#E2E8F0' }}
              >
                {showPreferences ? 'Hide Preferences' : 'Show Preferences'}
              </Button>
              <Collapse in={showPreferences}>
                <Box sx={{ mt: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: '#E2E8F0' }}>Task Type</InputLabel>
                    <Select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      sx={{ backgroundColor: '#374151', color: '#E2E8F0' }}
                    >
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="vqa">Visual Question Answering</MenuItem>
                      <MenuItem value="image_captioning">Image Captioning</MenuItem>
                      <MenuItem value="visual_language">Vision-Language</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Min Parameters (billions)"
                    type="number"
                    value={paramRangeMin}
                    onChange={(e) => setParamRangeMin(Number(e.target.value))}
                    fullWidth
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#374151', color: '#E2E8F0' } }}
                  />
                  <TextField
                    label="Max Parameters (billions)"
                    type="number"
                    value={paramRangeMax}
                    onChange={(e) => setParamRangeMax(Number(e.target.value))}
                    fullWidth
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#374151', color: '#E2E8F0' } }}
                  />
                  <TextField
                    label="GPU Memory (GB, optional)"
                    type="number"
                    value={hardwareGpuMemory || ''}
                    onChange={(e) => setHardwareGpuMemory(e.target.value ? Number(e.target.value) : null)}
                    fullWidth
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#374151', color: '#E2E8F0' } }}
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: '#E2E8F0' }}>Preference</InputLabel>
                    <Select
                      value={preference || ''}
                      onChange={(e) => setPreference(e.target.value || null)}
                      sx={{ backgroundColor: '#374151', color: '#E2E8F0' }}
                    >
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="efficiency">Efficiency</MenuItem>
                      <MenuItem value="performance">Performance</MenuItem>
                      <MenuItem value="multilingual">Multilingual</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Collapse>
            </Box>
          </Paper>
        </Draggable>
      )}
    </Box>,
    document.body
  );
};

export default Chatbot;