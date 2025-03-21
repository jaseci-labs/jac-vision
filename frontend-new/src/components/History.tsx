import React, { useState, useEffect } from 'react';
import { Typography, List, ListItem, ListItemText } from '@mui/material';

interface HistoryProps {
  themeMode: 'light' | 'dark';
}

interface VqaEntry {
  question: string;
  answer: string;
  timestamp: string;
}

const History: React.FC<HistoryProps> = ({ themeMode }) => {
  const [vqaHistory, setVqaHistory] = useState<VqaEntry[]>([]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('vqaHistory') || '[]');
    setVqaHistory(history);
  }, []);

  return (
    <div className={`content-section ${themeMode}`}>
      <Typography variant="h6">VQA History</Typography>
      {vqaHistory.length === 0 ? (
        <Typography variant="body1">No VQA history yet.</Typography>
      ) : (
        <List>
          {vqaHistory.map((entry, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`Question: ${entry.question}`}
                secondary={`Answer: ${entry.answer} | ${entry.timestamp}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default History;