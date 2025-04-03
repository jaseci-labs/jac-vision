import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  QuestionAnswer as VqaIcon,
  ModelTraining as ModelsIcon,
  DeveloperBoard as DeveloperIcon,
  Tune as FineTuneIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Image as ImageIcon, // Added for Image Captioning
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FineTune from './components/FineTune';
import VQA from './components/VQA';
import Search from './components/Search';
import Models from './components/Models';
import Developer from './components/Developer';
import Settings from './components/Settings';
import ImageCaptioning from './components/ImageCaptioning'; // Added for Image Captioning
import logo from './assets/logo.png';
import './styles/App.css';

const App: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('fine-tune');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [drawerOpen, setDrawerOpen] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const sidebarTheme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#5B21B6',
      },
      background: {
        default: themeMode === 'dark' ? '#0F172A' : '#F1F5F9',
        paper: themeMode === 'dark' ? '#1E293B' : '#FFFFFF',
      },
      text: {
        primary: themeMode === 'dark' ? '#E2E8F0' : '#1E293B',
      },
    },
    typography: {
      fontFamily: "'Poppins', sans-serif",
      h6: {
        fontWeight: 600,
      },
      body1: {
        fontWeight: 400,
      },
    },
  });

  const renderContent = () => {
    switch (selectedSection) {
      case 'fine-tune':
        return <FineTune selectedModel={selectedModel} setSelectedModel={setSelectedModel} toast={toast} />;
      case 'vqa':
        return <VQA selectedModel={selectedModel} setSelectedModel={setSelectedModel} toast={toast} />;
      case 'search':
        return <Search toast={toast} themeMode={themeMode} />;
      case 'models':
        return <Models toast={toast} themeMode={themeMode} />;
      case 'developer':
        return <Developer themeMode={themeMode} />;
      case 'settings':
        return <Settings themeMode={themeMode} setThemeMode={setThemeMode} />;
      case 'image-captioning': // Added for Image Captioning
        return <ImageCaptioning toast={toast} />;
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={sidebarTheme}>
      <CssBaseline />
      <div className="App">
        <AppBar
          position="fixed"
          className="app-bar"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: themeMode === 'dark'
              ? 'linear-gradient(90deg, #5B21B6 0%, #8B5CF6 100%)'
              : 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 100%)',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
            <img
              src={logo}
              alt="VLM Fine-Tuner Logo"
              style={{ height: '40px', marginRight: '10px' }}
            />
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: themeMode === 'dark' ? '#E2E8F0' : '#FFFFFF',
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              JAC VISION
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? drawerOpen : true}
          onClose={handleDrawerToggle}
          classes={{ paper: 'drawer-paper' }}
          sx={{
            width: drawerOpen ? 240 : 60,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerOpen ? 240 : 60,
              boxSizing: 'border-box',
              transition: 'width 0.3s',
              overflowX: 'hidden',
              backgroundColor: themeMode === 'dark' ? '#1E293B' : '#FFFFFF',
            },
          }}
        >
          <Toolbar />
          <List>
            {[
              { text: 'Search for a Model', icon: <SearchIcon />, section: 'search' },
              { text: 'VQA', icon: <VqaIcon />, section: 'vqa' },
              { text: 'Models', icon: <ModelsIcon />, section: 'models' },
              { text: 'Fine-Tune', icon: <FineTuneIcon />, section: 'fine-tune' },
              { text: 'Image Captioning', icon: <ImageIcon />, section: 'image-captioning' }, // Added for Image Captioning
              { text: 'Developer', icon: <DeveloperIcon />, section: 'developer' },
              { text: 'Settings', icon: <SettingsIcon />, section: 'settings' },
            ].map((item) => (
              <ListItemButton
                key={item.section}
                onClick={() => setSelectedSection(item.section)}
                selected={selectedSection === item.section}
                sx={{
                  backgroundColor: selectedSection === item.section ? '#8B5CF6' : 'transparent',
                  '&:hover': {
                    backgroundColor: selectedSection === item.section ? '#8B5CF6' : '#3B82F6',
                    transform: 'scale(1.02)',
                    transition: 'all 0.2s ease-in-out',
                  },
                  color: themeMode === 'dark' ? '#E2E8F0' : '#1E293B',
                  minHeight: 48,
                  justifyContent: drawerOpen ? 'initial' : 'center',
                  px: 2.5,
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: drawerOpen ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {React.cloneElement(item.icon, { style: { color: themeMode === 'dark' ? '#E2E8F0' : '#1E293B' } })}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ opacity: drawerOpen ? 1 : 0 }}
                />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
        <main
          className="content"
          style={{
            marginLeft: isMobile ? 0 : (drawerOpen ? 240 : 60),
            transition: 'margin-left 0.3s',
            paddingTop: '80px',
          }}
        >
          {renderContent()}
        </main>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={themeMode}
        />
      </div>
    </ThemeProvider>
  );
};

export default App;