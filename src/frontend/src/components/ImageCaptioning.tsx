import React, { useState, useEffect, useRef } from "react";
import {
  Stack,
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Switch
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  uploadImageFolder,
  getNextImage,
  saveCaption,
  downloadJson,
  downloadDataset,
  getJson,
  clearData,
  loadPrompts,
  changePrompt,
  startAutoCaptioning,
  getCaptioningProgress
} from "../utils/image_Captioning_api";
import ReactJson from "@microlink/react-json-view";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { API_URL } from "../utils/api";

interface ImageCaptioningProps {
  toast: typeof toast;
}

interface ImageData {
  image_path: string;
  caption: string;
  total: number;
}

const ImageCaptioning: React.FC<ImageCaptioningProps> = ({ toast }) => {
  const [apiKey, setApiKey] = useState<string>(
    localStorage.getItem("captionApiKey") || ""
  );
  const [apiType, setApiType] = useState<"openrouter" | "openai" | "gemini">(
    "openrouter"
  );
  const [openRouterModel, setOpenRouterModel] = useState<string>(
    "google/gemma-3-12b-it:free"
  );
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [testApiKeyLoading, setTestApiKeyLoading] = useState<boolean>(false);
  const [imageFolder, setImageFolder] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [datasetName, setDatasetName] = useState<string>("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);
  const [openClearDialog, setOpenClearDialog] = useState<boolean>(false);
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [autoCaption, setAutoCaption] = useState(false);
  const [prompt, setPrompt] = useState('Describe the damage in this car image');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const promptFieldRef = useRef<HTMLInputElement | null>(null);
  const captionFieldRef = useRef<HTMLInputElement | null>(null);
  const [captioningProgress, setCaptioningProgress] = useState(0);
  const [captioningStatus, setCaptioningStatus] = useState<String>('idle');
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);


  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const openRouterModels = [
    {
      value: "google/gemma-3-12b-it:free",
      label: "Google Gemma 3 12B (Free)"
    },
    {
      value: "meta-llama/llama-3.1-8b-instruct:free",
      label: "Meta LLaMA 3.1 8B (Free)",
    },
  ];

  useEffect(() => {
    localStorage.setItem("captionApiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    const fetchPrompt = async () => {
      const prompt = await loadPrompts();
      setPrompt(prompt.prompt);
    };
    fetchPrompt();
  }, []);

  useEffect(() => {
    if (captioningStatus === 'running') {
      const interval = setInterval(() => {
        fetchCaptioningProgress();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [captioningStatus]);

  const handleSaveApiKey = () => {
    setApiDialogOpen(false);
  };

  const validateApiKey = (key: string): boolean => {
    return key.trim().length > 10;
  };

  const logFormData = (formData: FormData) => {
    for (const [key, value] of Array.from(formData.entries())) {
      console.log(`${key}:`, value);
    }
  };

  const handleTestApiKey = async () => {
    if (!validateApiKey(apiKey)) {
      setError("Invalid API key. Please enter a valid key.");
      toast.error("Invalid API key. Please enter a valid key.");
      return;
    }
    setTestApiKeyLoading(true);
    setError("");
    try {
      await getNextImage(localStorage.getItem("datasetName") || "", apiKey, apiType, openRouterModel);
      toast.success("API key is valid!");
    } catch (error: any) {
      ``
      const errorMessage =
        error.message || "Invalid API key. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setTestApiKeyLoading(false);
  };

  const handleUploadFolder = async () => {
    if (!datasetName.trim()) {
      setError("Please enter a dataset name.");
      toast.error("Please enter a dataset name.");
      return;
    }
    if (!imageFolder) {
      setError("Please select an image folder to upload.");
      toast.error("Please select an image folder to upload.");
      return;
    }
    if (imageFolder.size > MAX_FILE_SIZE) {
      setError("File size exceeds 50 MB. Please upload a smaller file.");
      toast.error("File size exceeds 50 MB. Please upload a smaller file.");
      return;
    }
    if (!validateApiKey(apiKey)) {
      setError("Invalid API key. Please enter a valid key.");
      toast.error("Invalid API key. Please enter a valid key.");
      return;
    }
    setUploadLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", imageFolder);
      formData.append("folder_name", datasetName.trim());
      logFormData(formData);
      const response = await uploadImageFolder(formData);
      toast.success(response.message);
      localStorage.setItem("datasetName", response.folder_name);
      fetchNextImage(response.folder_name);
    } catch (error: any) {
      const errorMessage =
        error.message || "Error uploading image folder. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setUploadLoading(false);
  };

  const fetchNextImage = async (folder_name: string) => {
    try {
      const data = await getNextImage(folder_name, apiKey, apiType, openRouterModel);
      if (data.done) {
        setImageData(null);
        toast.success(data.message);
        setImageData(null);
        await handlePreviewJson();
      } else {
        setImageData({
          image_path: data.image_path ?? "",
          caption: data.caption ?? "",
          total: data.total ?? 0,
        });
        setCaption(data.caption ?? "");
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Error loading image. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleSaveNext = async () => {
    if (!imageData) return;
    setSaveLoading(true);
    setError("");
    try {
      await saveCaption({ caption, image_path: imageData.image_path, dataset_path: localStorage.getItem("datasetName") || "" });
      toast.success("Caption saved successfully");
      fetchNextImage(localStorage.getItem("datasetName") || "");
    } catch (error: any) {
      const errorMessage =
        error.message || "Error saving caption. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setSaveLoading(false);
  };

  const handleDownloadJson = async () => {
    setDownloadLoading(true);
    setError("");
    try {
      const response = await downloadJson();
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "jsons/car_damage_data.json");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("JSON file downloaded successfully");
    } catch (error: any) {
      const errorMessage =
        error.message || "Error downloading JSON file. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setDownloadLoading(false);
  };

  const handleDownloadDataset = async () => {
    setDownloadLoading(true);
    setError("");
    try {
      const response = await downloadDataset();
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      const datasetName = localStorage.getItem('datasetName') || 'dataset';
      link.setAttribute("download", `${datasetName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Dataset downloaded successfully");
    } catch (error: any) {
      const errorMessage =
        error.message || "Error downloading dataset. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setDownloadLoading(false);
  };

  const handlePreviewJson = async () => {
    try {
      const response = await getJson();
      setJsonData(response.data);
      setShowJsonPreview(true);
    } catch (error: any) {
      const errorMessage =
        error.message || "Error fetching JSON data. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleClearData = async () => {
    try {
      await clearData();
      setImageData(null);
      setCaption("");
      setJsonData(null);
      setShowJsonPreview(false);
      toast.success("All data cleared successfully");
    } catch (error: any) {
      const errorMessage =
        error.message || "Error clearing data. Check the console.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    }
    setOpenClearDialog(false);
  };

  const handleToggle = (event: any) => {
    setAutoCaption(event.target.checked);
  };

  const handleAdjustPrompt = async () => {
    if (promptFieldRef.current) {
      promptFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      handleEditClick();
    }
  };

  const handleAutoSaveNext = async () => {
    const response = await startAutoCaptioning(
      localStorage.getItem("datasetName") || "",
      apiKey,
      apiType,
      openRouterModel
    );

    if (response["message"] == "Auto captioning started") {
      setCaptioningStatus('running');
    }
  };

  const handleEditClick = async () => {
    setEditedPrompt(prompt);
    setIsEditing(true);
  };

  const handleUpdatePrompt = async () => {
    console.log("Updated prompt:", editedPrompt);
    setPrompt(editedPrompt);
    const response = changePrompt(editedPrompt);
    setIsEditing(false);
    console.log("Prompt updated:", response);
    if (imageData) {
      fetchNextImage(localStorage.getItem("datasetName") || "");
      if (captionFieldRef.current) {
        captionFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const fetchCaptioningProgress = async () => {
    const { status, progress } = await getCaptioningProgress();
    setCaptioningStatus(status);
    setCaptioningProgress(progress.percentage);
    if (status === 'running') {
      setShowProgressOverlay(true);
    } else {
      setShowProgressOverlay(false);
      if (progress.percentage === 100) {
        toast.success("Captioning completed successfully");
        setCaptioningProgress(0);
        setImageData(null);
        await handlePreviewJson();
      }
    }
  }

  return (
    <Box
      className="content-section"
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: "1200px",
        mx: "auto",
        width: "100%",
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: { xs: 1, sm: 0 }, textAlign: { xs: "center", sm: "left" } }}
        >
          Automatic Image Captioning
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setApiDialogOpen(true)}
            sx={{
              borderColor: "#3B82F6",
              color: "#3B82F6",
              "&:hover": {
                borderColor: "#2563EB",
                color: "#2563EB",
              },
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            API Key
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        {/* Row with API Type & Test Button */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            mb: 2,
          }}
        >
          {/* API Type Selector */}
          <FormControl sx={{ flex: 1 }}>
            <InputLabel sx={{ color: "#9CA3AF" }}>API Type</InputLabel>
            <MuiSelect
              value={apiType}
              onChange={(e) =>
                setApiType(e.target.value as "openrouter" | "openai" | "gemini")
              }
              sx={{
                "& .MuiSelect-select": {
                  color: "#E2E8F0",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#4B5563",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#5B21B6",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#5B21B6",
                },
              }}
            >
              <MenuItem value="openrouter">OpenRouter</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="gemini">Gemini</MenuItem>
            </MuiSelect>
          </FormControl>

          {/* Test API Key Button */}
          <Button
            variant="outlined"
            onClick={handleTestApiKey}
            disabled={testApiKeyLoading}
            sx={{
              alignSelf: { xs: "stretch", md: "center" },
              whiteSpace: "nowrap",
              borderColor: "#3B82F6",
              color: "#3B82F6",
              "&:hover": {
                borderColor: "#2563EB",
                color: "#2563EB",
              },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              height: "56px", // Match typical input height
            }}
          >
            {testApiKeyLoading ? <CircularProgress size={20} /> : "Test API Key"}
          </Button>
        </Box>

        {/* OpenRouter Model Selector */}
        {apiType === "openrouter" && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: "#9CA3AF" }}>OpenRouter Model</InputLabel>
            <MuiSelect
              value={openRouterModel}
              onChange={(e) => setOpenRouterModel(e.target.value as string)}
              sx={{
                "& .MuiSelect-select": {
                  color: "#E2E8F0",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#4B5563",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#5B21B6",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#5B21B6",
                },
              }}
            >
              {openRouterModels.map((model) => (
                <MenuItem key={model.value} value={model.value}>
                  {model.label}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        )}

        <TextField
          fullWidth
          variant="outlined"
          label="Dataset Name"
          placeholder="Enter the Dataset Name"
          value={datasetName}
          onChange={(e) => setDatasetName(e.target.value)}
          sx={{
            input: { color: "#E2E8F0" },
            label: { color: "#9CA3AF" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#4B5563" },
              "&:hover fieldset": { borderColor: "#5B21B6" },
              "&.Mui-focused fieldset": { borderColor: "#5B21B6" },
            },
          }}
        />
      </Box>

      <TextField
        label="Caption Prompt"
        value={isEditing ? editedPrompt : prompt}
        onChange={(e) => setEditedPrompt(e.target.value)}
        fullWidth
        multiline
        rows={3}
        margin="normal"
        variant="outlined"
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#4B5563' },
            '&:hover fieldset': { borderColor: '#5B21B6' },
            '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
          },
          '& .MuiInputLabel-root': { color: '#9CA3AF' },
          '& .MuiInputBase-input': { color: '#E2E8F0' },
        }}
        disabled={!isEditing}
        inputRef={promptFieldRef}
      />

      {isEditing ? (
        <Button variant="contained" color="primary" onClick={handleUpdatePrompt}>
          Update Prompt
        </Button>
      ) : (
        <Button variant="outlined" onClick={handleEditClick}>
          Edit Prompt
        </Button>
      )}

      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ color: "#E2E8F0", mb: 1 }}>
          Upload Image Folder (ZIP file, max 50 MB):
        </Typography>

        <input
          type="file"
          accept=".zip"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (file && file instanceof File) {
              console.log("Selected file:", file.name, file.type, file.size);
              setImageFolder(file);
            } else {
              console.log("No valid file selected");
              setImageFolder(null);
            }
          }}
          style={{
            margin: "10px 0",
            color: "#E2E8F0",
            width: "100%",
            display: "block",
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 2 }}
        >
          <Button
            variant="contained"
            size="small"
            onClick={handleUploadFolder}
            disabled={uploadLoading}
            sx={{
              backgroundColor: "#5B21B6",
              "&:hover": {
                backgroundColor: "#8B5CF6",
                transform: "scale(1.03)",
                transition: "all 0.2s ease-in-out",
              },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              px: 2,
            }}
          >
            {uploadLoading ? <CircularProgress size={18} /> : "Upload Folder"}
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleDownloadJson}
            disabled={downloadLoading}
            sx={{
              backgroundColor: "#FF9800",
              "&:hover": {
                backgroundColor: "#F57C00",
                transform: "scale(1.03)",
                transition: "all 0.2s ease-in-out",
              },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              px: 2,
            }}
          >
            {downloadLoading ? <CircularProgress size={18} /> : "Download JSON"}
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleDownloadDataset}
            disabled={downloadLoading}
            sx={{
              backgroundColor: "#FF5722",
              "&:hover": {
                backgroundColor: "#E64A19",
                transform: "scale(1.03)",
                transition: "all 0.2s ease-in-out",
              },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              px: 2,
            }}
          >
            {downloadLoading ? (
              <CircularProgress size={18} />
            ) : (
              "Download Dataset"
            )}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handlePreviewJson}
            sx={{
              borderColor: "#2196F3",
              color: "#2196F3",
              "&:hover": {
                borderColor: "#1976D2",
                color: "#1976D2",
              },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              px: 2,
            }}
          >
            Preview JSON
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => setOpenClearDialog(true)}
            sx={{
              backgroundColor: "#EF5350",
              "&:hover": {
                backgroundColor: "#F44336",
                transform: "scale(1.03)",
                transition: "all 0.2s ease-in-out",
              },
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              px: 2,
            }}
          >
            Clear Data
          </Button>
        </Stack>
      </Box>

      {error && (
        <Typography
          variant="body1"
          color="error"
          sx={{ mt: 2, textAlign: "center" }}
        >
          {error}
        </Typography>
      )}

      {imageData && (
        <Box>
          {/* Toggle Button */}
          <FormControlLabel
            control={
              <Switch
                checked={autoCaption}
                onChange={handleToggle}
                color="primary"
                sx={{ mb: 2 }}
              />
            }
            label={autoCaption ? 'Auto Captioning' : 'Manual Captioning'}
            sx={{ mb: 2, color: '#E2E8F0' }}
          />

          {/* Image Display */}
          <Typography variant="body1" sx={{ color: '#E2E8F0', mb: 1 }}>
            {
              autoCaption
                ? 'Caption for the first image'
                : `Processing image ${imageData.image_path} (Remaining: ${imageData.total})`
            }
          </Typography>

          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <img
              src={`${API_URL}/api/datasets/images/${localStorage.getItem('datasetName') || ''}/${imageData.image_path}`}
              alt="Car Image"
              style={{
                maxWidth: '300px',
                height: 'auto',
                border: '2px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </Box>

          {/* Caption Input */}
          <TextField
            label="Condition Description"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            multiline
            rows={6}
            fullWidth
            margin="normal"
            variant="outlined"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#4B5563' },
                '&:hover fieldset': { borderColor: '#5B21B6' },
                '&.Mui-focused fieldset': { borderColor: '#5B21B6' },
              },
              '& .MuiInputLabel-root': { color: '#9CA3AF' },
              '& .MuiInputBase-input': { color: '#E2E8F0' },
            }}
            inputRef={captionFieldRef}
          />

          {/* Generate Caption Button (Auto mode only) */}
          {autoCaption ? (
            <>
              <Button
                variant="contained"
                onClick={handleAdjustPrompt}
                disabled={captionLoading}
                sx={{
                  mb: 2,
                  mr: 2,
                  backgroundColor: '#5B21B6',
                  '&:hover': { backgroundColor: '#4C1D95' },
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {captionLoading ? <CircularProgress size={24} /> : 'Adjust Prompt'}
              </Button>

              <Button
                variant="contained"
                onClick={handleAutoSaveNext}
                disabled={captionLoading}
                sx={{
                  mb: 2,
                  mr: 2,
                  backgroundColor: '#4CAF50',
                  '&:hover': { backgroundColor: '#4C1D95' },
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {captionLoading ? <CircularProgress size={24} /> : 'Generate Captions for All Images'}
              </Button>
            </>
          ) : (
            < Button
              variant="contained"
              onClick={handleSaveNext}
              disabled={saveLoading || (autoCaption && captionLoading)}
              sx={{
                mb: 2,
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#45a049' },
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              {saveLoading ? <CircularProgress size={24} /> : 'Save & Next'}
            </Button>
          )}
        </Box>
      )
      }

      {showProgressOverlay && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(5px)',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <CircularProgress
            size={80}
            thickness={5}
            sx={{ color: '#5B21B6', mb: 2 }}
            variant="determinate"
            value={captioningProgress}
          />
          <Typography variant="h6" sx={{ color: '#fff' }}>
            Captioning Progress: {captioningProgress}%
          </Typography>
        </Box>
      )}

      {
        showJsonPreview && jsonData && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: "1px solid #4B5563",
              borderRadius: "8px",
              backgroundColor: "#1F2937",
            }}
          >
            <Typography variant="h6" sx={{ color: "#E2E8F0", mb: 2 }}>
              JSON Data Preview
            </Typography>
            <ReactJson
              src={jsonData}
              theme="monokai"
              collapsed={1}
              style={{ backgroundColor: "transparent" }}
            />
            <Button
              variant="contained"
              onClick={() => setShowJsonPreview(false)}
              sx={{
                mt: 2,
                backgroundColor: "#EF5350",
                "&:hover": {
                  backgroundColor: "#F44336",
                },
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Close
            </Button>
          </Box>
        )
      }
      <Dialog
        open={openClearDialog}
        onClose={() => setOpenClearDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Clear All Data?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to clear all data? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleClearData} color="error" autoFocus>
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog
        open={apiDialogOpen}
        onClose={() => setApiDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            width: '500px',
            maxWidth: '90%',
          },
        }}
      >
        <DialogTitle>Enter API Key</DialogTitle>
        <DialogContent>
          <TextField
            label="API Key"
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#4B5563",
                },
                "&:hover fieldset": {
                  borderColor: "#5B21B6",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#5B21B6",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#9CA3AF",
              },
              "& .MuiInputBase-input": {
                color: "#E2E8F0",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveApiKey} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default ImageCaptioning;
