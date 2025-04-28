import React, { useEffect, useRef } from 'react';
import Select from 'react-select';
import { Box, Button, TextField, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Table, TableHead, TableRow, TableBody, TableCell } from '@mui/material';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { finetuneModel, fetchModels, getTaskStatus, fetchDatasets, API_URL } from '../utils/api';
import { toast } from 'react-toastify';
import { useFineTuneStore } from '../utils/FineTuneStore';

interface FineTuneProps {
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
  toast: typeof toast;
}

function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary' }}
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

const FineTune: React.FC<FineTuneProps> = ({ selectedModel, setSelectedModel, toast }) => {
  const {
    datasetLink,
    fineTuneStatus,
    fineTuneLoading,
    error,
    modelOptions,
    datasetOptions,
    taskId,
    viewProgress,
    logs,
    datasetSize,
    epochs,
    learningRate,
    setDatasetLink,
    setFineTuneStatus,
    setFineTuneLoading,
    setError,
    setModelOptions,
    setDatasetOptions,
    setTaskId,
    setViewProgress,
    setLogs,
    setDatasetSize,
    setEpochs,
    setLearningRate,
  } = useFineTuneStore();

  const accordionDetailsRef = useRef(null);

  useEffect(() => {
    if (accordionDetailsRef.current) {
      accordionDetailsRef.current.scrollTop = accordionDetailsRef.current.scrollHeight;
    }
  }, [logs]);

  const loadModels = async () => {
    try {
      const response = await fetchModels();
      const models = response.models || [];
      const options = models.map((model: string) => ({
        value: model,
        label: model,
      }));
      setModelOptions(options);
    } catch (error: any) {
      const errorMessage = error.message || 'Error loading models. Check the console.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const loadDatasets = async () => {
    try {
      const response = await fetchDatasets();
      const datasets = response.datasets || [];
      const options = datasets.map((dataset: string) => ({
        value: dataset,
        label: dataset,
      }));
      setDatasetOptions(options);
    } catch (error: any) {
      const errorMessage = error.message || 'Error loading datasets. Check the console.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
  };

  useEffect(() => {
    loadModels();
    loadDatasets();
  }, []);


  useEffect(() => {
    if (!taskId) return;

    const eventSource = new EventSource(`${API_URL}/api/finetune/stream-status/${taskId}`);

    eventSource.onmessage = (event) => {
      const taskStatus = JSON.parse(event.data);
      console.log("Received update:", taskStatus);

      if (taskStatus) {
        setViewProgress(taskStatus.data.progress);

        if (taskStatus.progress === 0) {
          setFineTuneLoading(true);
        } else {
          if (taskStatus.data.status === 'COMPLETED') {
            setFineTuneLoading(false);
            setFineTuneStatus('Fine-tuning completed successfully!');
            toast.success('Fine-tuning completed successfully!');
            eventSource.close();
          } else if (taskStatus.data.status === 'FAILED') {
            setFineTuneStatus('Fine-tuning failed.');
            toast.error('Fine-tuning failed.');
            setFineTuneLoading(false);
            eventSource.close();
          }

          const currentLogs = useFineTuneStore.getState().logs;
          setLogs([
            ...currentLogs,
            {
              status: taskStatus.data.status,
              progress: `${taskStatus.data.progress}%`,
              epoch: taskStatus.data.epoch || 'N/A',
              loss: taskStatus.data.loss || 'N/A',
            },
          ]);
        }
      } else {
        setLogs([
          ...logs,
          { status: 'Error', progress: 'N/A', epoch: 'N/A', loss: 'N/A' },
        ]);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
      setLogs([
        ...logs,
        { status: 'Error', progress: 'N/A', epoch: 'N/A', loss: 'N/A' },
      ]);
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);


  const handleFinetune = async () => {
    if (!selectedModel || !datasetLink) {
      setError('Please select a model and provide a dataset link.');
      toast.error('Please select a model and provide a dataset link.');
      return;
    }
    setFineTuneLoading(true);
    setError('');
    try {
      setLogs([]);
      console.log(selectedModel, datasetLink, "Test");
      const response = await finetuneModel(selectedModel, datasetLink, "Test");
      setViewProgress(0);
      console.log(response.status);
      setFineTuneStatus(response.status);
      setTaskId(response["task_id"]);
      localStorage.setItem('taskId', response["task_id"]);
    } catch (error: any) {
      const errorMessage = error.message || 'Error during fine-tuning. Check the console.';
      setError(errorMessage);
      setFineTuneStatus('');
      toast.error(errorMessage);
      console.error(error);
    }
  };

  return (
    <Box
      className="content-section"
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        maxWidth: '1200px',
        mx: 'auto',
        width: '100%',
        backgroundColor: '#1F2937',
        borderRadius: '12px',
        boxShadow: 3,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 2,
          textAlign: 'center',
          color: '#E2E8F0'
        }}
      >
        Fine-Tune Your Model
      </Typography>

      <Typography
        variant="body2"
        sx={{
          mb: 3,
          textAlign: 'center',
          color: '#9CA3AF',
          maxWidth: '800px',
          mx: 'auto'
        }}
      >
        Select the Model and Dataset you want to use for fine-tuning. Adjust the parameters as needed, and click "Start Fine-Tuning" to begin the process. You can monitor the progress in the console logs below.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          mb: 4,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Select
            placeholder="Select Model"
            options={modelOptions}
            onChange={(option) => setSelectedModel(option?.value || '')}
            value={modelOptions.find((option) => option.value === selectedModel) || null}
            styles={{
              container: (base) => ({
                ...base,
                width: '100%',
              }),
              control: (base, state) => ({
                ...base,
                height: '56px',
                borderColor: state.isFocused ? '#5B21B6' : '#4B5563',
                boxShadow: 'none',
                backgroundColor: 'transparent',
                color: '#E2E8F0',
                '&:hover': { borderColor: '#5B21B6' },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#1F2937',
                color: '#E2E8F0',
                zIndex: 9999,
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? '#5B21B6'
                  : state.isFocused
                    ? '#374151'
                    : 'transparent',
                color: '#E2E8F0',
                cursor: 'pointer',
                '&:active': {
                  backgroundColor: '#4C1D95',
                },
              }),
              singleValue: (base) => ({
                ...base,
                color: '#E2E8F0',
              }),
              placeholder: (base) => ({
                ...base,
                color: '#9CA3AF',
              }),
            }}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Select
            placeholder="Select the Dataset"
            options={datasetOptions}
            onChange={(option) => setDatasetLink(option?.value || '')}
            value={datasetOptions.find((option) => option.value === datasetLink)}
            styles={{
              container: (base) => ({
                ...base,
                width: '100%',
              }),
              control: (base, state) => ({
                ...base,
                height: '56px',
                borderColor: state.isFocused ? '#5B21B6' : '#4B5563',
                boxShadow: 'none',
                backgroundColor: 'transparent',
                color: '#E2E8F0',
                '&:hover': { borderColor: '#5B21B6' },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#1F2937',
                color: '#E2E8F0',
                zIndex: 9999,
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? '#5B21B6'
                  : state.isFocused
                    ? '#374151'
                    : 'transparent',
                color: '#E2E8F0',
                cursor: 'pointer',
                '&:active': {
                  backgroundColor: '#4C1D95',
                },
              }),
              singleValue: (base) => ({
                ...base,
                color: '#E2E8F0',
              }),
              placeholder: (base) => ({
                ...base,
                color: '#9CA3AF',
              }),
            }}
          />
        </Box>
      </Box>

      {/* Expandable Parameter Section */}
      <Accordion sx={{ mb: 3, backgroundColor: '#1F2937', borderRadius: '8px' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9CA3AF' }} />} sx={{ backgroundColor: '#2D3748' }}>
          <Typography sx={{ color: '#E2E8F0', fontWeight: 500 }}>
            Adjust Fine-Tuning Parameters
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ backgroundColor: '#2D3748' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, flexDirection: 'column', gap: 2 }}>
            {[
              { label: 'Training Size', value: datasetSize, set: setDatasetSize },
              { label: 'Epochs', value: epochs, set: setEpochs },
              // { label: 'Training Steps', value: steps, set: setSteps },
              { label: 'Learning Rate', value: learningRate, set: setLearningRate },
              // { label: 'Batch Size', value: batchSize, set: setBatchSize },
              // { label: 'Sequence Length', value: sequenceLength, set: setSequenceLength },
              // { label: 'Mixed Precision', value: precision, set: setPrecision },
            ].map((item, index) => (
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 1 }}>
                  {item.label}
                </Typography>
                <TextField
                  value={item.value}
                  onChange={(e) => item.set(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '40px', // Reduced height for a cleaner look
                      '& fieldset': { borderColor: '#4B5563' },
                      '&:hover fieldset': { borderColor: '#5B21B6' },
                      '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
                    },
                    '& .MuiInputLabel-root': { color: '#9CA3AF' },
                    '& .MuiInputBase-input': { color: '#E2E8F0' },
                  }}
                />
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        onClick={handleFinetune}
        disabled={fineTuneLoading}
        sx={{
          width: '100%',
          backgroundColor: '#5B21B6',
          '&:hover': {
            backgroundColor: '#8B5CF6',
            transform: 'scale(1.05)',
            transition: 'all 0.2s ease-in-out',
          },
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          py: 1.5,
        }}
      >
        {fineTuneLoading ? <CircularProgress size={24} /> : 'Start Fine-Tuning'}
      </Button>

      {error && (
        <Typography variant="body1" color="error" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      {fineTuneStatus && !error && (
        <Typography variant="body1" sx={{ mt: 2, color: '#E2E8F0', textAlign: 'center' }}>
          {fineTuneStatus}
          {fineTuneStatus === 'STARTED' && (
            <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
              This process may take a few minutes to start. Please be patient.
            </Typography>
          )}
        </Typography>
      )}

      <Box sx={{ mt: 3 }}>
        {/* Progress Bar */}
        {fineTuneStatus === "RUNNING" || fineTuneStatus === "STARTED" && (<Box sx={{ width: '100%', mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#E2E8F0', mb: 1 }}>
            Progress
          </Typography>
          <LinearProgressWithLabel
            variant="determinate"
            value={viewProgress}
            sx={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#4A5568',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#5B21B6',
              },
            }}
          />
        </Box>)}
      </Box>

      {/* Console/Log Section */}
      <Accordion sx={{ backgroundColor: '#2D3748', color: '#E2E8F0', mt: 3, borderRadius: 2, boxShadow: 1 }} defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: '#9CA3AF' }} />}
          sx={{
            backgroundColor: '#1A202C',
            color: '#E2E8F0',
            fontWeight: 600,
            padding: '12px 20px',
            '&:hover': {
              backgroundColor: '#4A5568',
            },
          }}
        >
          <Typography variant="body1" sx={{ color: '#E2E8F0' }}>
            Console Logs
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: 2, backgroundColor: '#1A202C', maxHeight: 250, overflowY: 'auto', borderRadius: '0 0 8px 8px' }} ref={accordionDetailsRef}>
          <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Progress</TableCell>
                <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Epoch</TableCell>
                <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>Loss</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ color: '#9CA3AF' }}>{log.status}</TableCell>
                  <TableCell sx={{ color: '#9CA3AF' }}>{log.progress}</TableCell>
                  <TableCell sx={{ color: '#9CA3AF' }}>{log.epoch}</TableCell>
                  <TableCell sx={{ color: '#9CA3AF' }}>{log.loss}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default FineTune;