import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
  } from 'recharts';
  
  interface FineTuneMetricChartProps {
    data: Array<{
      step: number;
      loss: number;
      mean_token_accuracy: number;
      learning_rate: number;
    }>;
    themeMode: 'dark' | 'light';
  }

  const FineTuneMetricChart = ({ data, themeMode }: FineTuneMetricChartProps) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={themeMode === 'dark' ? '#4B5563' : '#D1D5DB'}
          />
          <XAxis
            dataKey="step"
            stroke={themeMode === 'dark' ? '#E2E8F0' : '#000000'}
            label={{ value: 'Step', position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis
            stroke={themeMode === 'dark' ? '#E2E8F0' : '#000000'}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: themeMode === 'dark' ? '#2D3748' : '#FFFFFF',
              borderColor: themeMode === 'dark' ? '#4B5563' : '#D1D5DB',
            }}
            labelStyle={{
              color: themeMode === 'dark' ? '#E2E8F0' : '#000000',
            }}
            itemStyle={{
              color: themeMode === 'dark' ? '#A5B4FC' : '#4B5563',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="loss"
            name="Loss"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="mean_token_accuracy"
            name="Accuracy"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="learning_rate"
            name="Learning Rate"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };
  