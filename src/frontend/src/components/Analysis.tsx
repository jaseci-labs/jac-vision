import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Stack,
  SelectChangeEvent
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { API_URL } from '../utils/api';

interface DeveloperProps {
  themeMode: 'light' | 'dark';
}

type LogEntry = {
  step: number;
  epoch?: number;
  loss?: number;
  grad_norm?: number;
  learning_rate?: number;
  mean_token_accuracy?: number;
  train_runtime?: number;
  train_loss?: number;
  [key: string]: any;
};

type Task = {
  status: string;
  metrics: Record<string, number>;
  log_history: LogEntry[];
};

const metricsToDisplay = {
  loss: 'Loss',
  mean_token_accuracy: 'Mean Token Accuracy',
  grad_norm: 'Gradient Norm',
  learning_rate: 'Learning Rate'
};

const Analysis: React.FC<DeveloperProps> = ({ themeMode }) => {
  const [models, setModels] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/inference/models`);
        setModels(res.data.models);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (selectedModel) {
        setLoading(true);
        try {
          const res = await axios.get(`${API_URL}/api/finetune/get-metrics/${selectedModel}`);
          setTasks(res.data);
        } catch (error) {
          console.error('Failed to fetch metrics:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchMetrics();
  }, [selectedModel]);


  const handleModelChange = (event: SelectChangeEvent<string>) => {
    setSelectedModel(event.target.value);
  };

  return (
    <div className={`content-section ${themeMode}`}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        System Metrics Dashboard
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box>
          {/* Layout Stack for better responsiveness */}
          <Stack spacing={3} direction="column">
            <Box>
              <FormControl fullWidth>
                <InputLabel>Select Model</InputLabel>
                <Select
                  value={selectedModel || ''}
                  label="Select Model"
                  onChange={handleModelChange}
                >
                  {models.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box mt={3}>
              {(Object.keys(metricsToDisplay) as Array<keyof typeof metricsToDisplay>).map((metric) => {
                const data = (tasks?.log_history || []).filter(
                  (log: any) => log?.step !== undefined && log?.[metric] !== undefined
                );
                return (
                  <Box key={metric} mb={5}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      {metricsToDisplay[metric]}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#e0e0e0" />
                        <XAxis dataKey="step" tick={{ fontSize: 12 }} stroke="#888" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#888" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', borderRadius: 10, borderColor: '#ccc' }}
                          labelStyle={{ fontWeight: 600 }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                          type="monotone"
                          dataKey={metric}
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 5 }}
                          animationDuration={500}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                  </Box>
                );
              })}
            </Box>
          </Stack>
        </Box>
      )}
    </div>
  );
};

export default Analysis;
