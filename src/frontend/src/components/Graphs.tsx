// Graph.tsx
import { Box, Typography } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type EpochLog = {
  epoch: string;
  training_loss: string;
  validation_loss: string;
};

type GraphProps = {
  data: EpochLog[];
};

const Graph = ({ data }: GraphProps) => {
  return (
    <Box mt={4}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Training vs Validation Loss
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorTrain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 4" stroke="#e0e0e0" />
          <XAxis dataKey="epoch" tick={{ fontSize: 12 }} stroke="#888" />
          <YAxis tick={{ fontSize: 12 }} stroke="#888" />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', borderRadius: 10, borderColor: '#ccc' }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend verticalAlign="top" height={36} />

          <Line
            type="monotone"
            dataKey="training_loss"
            name="Training Loss"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            animationDuration={300}
          />

          <Line
            type="monotone"
            dataKey="validation_loss"
            name="Validation Loss"
            stroke="#82ca9d"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default Graph;
