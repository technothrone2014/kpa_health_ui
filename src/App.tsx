import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Employees from "./pages/Employees";
import DataCorrection from "./pages/DataCorrection";
import Dashboard from "./pages/Dashboard";
import { 
  AppBar, Toolbar, Container, Typography, Box, IconButton, Drawer, 
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  useMediaQuery, useTheme 
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AnchorIcon from '@mui/icons-material/Anchor';
import WavesIcon from '@mui/icons-material/Waves';
import CompassCalibrationIcon from '@mui/icons-material/CompassCalibration';
import { useState } from "react";
import AdvancedAnalytics from './components/AdvancedAnalytics';

const queryClient = new QueryClient();

// Oceanic Theme Colors
const oceanTheme = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  light: '#2B7BA8',
  surface: '#4AA3C2',
  wave: '#6EC8D9',
  foam: '#A8E6CF',
  gold: '#FFD700',
  navy: '#0A1C40',
  white: '#FFFFFF',
};

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePath, setActivePath] = useState("/");

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', nauticalIcon: '🧭' },
    { text: 'Clients', icon: <PeopleIcon />, path: '/employees', nauticalIcon: '👨‍✈️' },
    { text: 'Data Correction', icon: <DataUsageIcon />, path: '/data-correction', nauticalIcon: '⚓' },
  ];

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      background: `linear-gradient(180deg, ${oceanTheme.navy} 0%, ${oceanTheme.deep} 50%, ${oceanTheme.mid} 100%)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ocean Wave Overlay */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: '100px',
        background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${oceanTheme.surface}10 10px, ${oceanTheme.surface}20 20px)`,
        pointerEvents: 'none'
      }} />
      
      {/* Animated Wave Lines */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        background: `radial-gradient(circle at 20% 50%, ${oceanTheme.foam}05 0%, transparent 50%)`,
        pointerEvents: 'none'
      }} />
      
      {/* Sidebar Header with Ship Wheel */}
      <Box sx={{ 
        p: 3, 
        textAlign: 'center', 
        borderBottom: `2px solid ${oceanTheme.gold}30`,
        position: 'relative',
        background: `linear-gradient(135deg, ${oceanTheme.navy}80, ${oceanTheme.deep}80)`,
      }}>
        {/* Animated Ship Wheel */}
        <Box sx={{ 
          position: 'absolute',
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: '50%',
          border: `2px solid ${oceanTheme.gold}20`,
          opacity: 0.3,
          animation: 'spin 20s linear infinite',
        }} />
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 1 
        }}>
          <Box sx={{ 
            width: 70, 
            height: 70, 
            background: `linear-gradient(135deg, ${oceanTheme.gold}, #FFA500)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <AnchorIcon sx={{ fontSize: 40, color: oceanTheme.navy }} />
          </Box>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: oceanTheme.gold, 
              mt: 1,
              fontWeight: 'bold',
              fontSize: '0.9rem',
              letterSpacing: '1px'
            }}
          >
            KPA Health Intelligence
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: oceanTheme.foam,
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <WavesIcon sx={{ fontSize: 12 }} /> EAP Health Week <WavesIcon sx={{ fontSize: 12 }} />
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ px: 2, py: 3, position: 'relative', zIndex: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={Link} 
              to={item.path}
              onClick={() => {
                setActivePath(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: '12px',
                py: 1.5,
                px: 2,
                transition: 'all 0.3s ease',
                background: activePath === item.path 
                  ? `linear-gradient(135deg, ${oceanTheme.gold}, #FFA500)`
                  : 'transparent',
                '&:hover': {
                  background: `linear-gradient(135deg, ${oceanTheme.gold}40, #FFA50040)`,
                  transform: 'translateX(8px)',
                },
                '& .MuiListItemIcon-root': {
                  minWidth: 40,
                },
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Hover Wave Effect */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${oceanTheme.gold}, transparent)`,
                transform: 'scaleX(0)',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scaleX(1)',
                }
              }} />
              
              <ListItemIcon sx={{ 
                color: activePath === item.path ? oceanTheme.navy : oceanTheme.foam,
                transition: 'all 0.3s ease'
              }}>
                <Box sx={{ position: 'relative' }}>
                  {item.icon}
                  <Box sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    fontSize: '10px',
                    opacity: 0.7
                  }}>
                    {item.nauticalIcon}
                  </Box>
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  '& .MuiTypography-root': { 
                    color: activePath === item.path ? oceanTheme.navy : oceanTheme.white,
                    fontWeight: activePath === item.path ? 'bold' : 'normal',
                    transition: 'all 0.3s ease'
                  } 
                }} 
              />
              
              {/* Active Indicator */}
              {activePath === item.path && (
                <Box sx={{
                  position: 'absolute',
                  right: 16,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: oceanTheme.navy,
                  animation: 'pulse 2s infinite'
                }} />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Decorative Compass Rose */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 20, 
        left: '50%', 
        transform: 'translateX(-50%)',
        textAlign: 'center',
        opacity: 0.3
      }}>
        <CompassCalibrationIcon sx={{ color: oceanTheme.foam, fontSize: 40, animation: 'spin 60s linear infinite' }} />
        <Typography variant="caption" sx={{ color: oceanTheme.foam, display: 'block', mt: 1 }}>
          Kenya Ports Authority
        </Typography>
      </Box>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </Box>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
          {/* Desktop Sidebar */}
          <Box
            component="nav"
            sx={{
              width: { sm: 280 },
              flexShrink: { sm: 0 },
              display: { xs: 'none', sm: 'block' }
            }}
          >
            <Box sx={{ width: 280, position: 'fixed', height: '100vh' }}>
              {drawer}
            </Box>
          </Box>

          {/* Mobile drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{ display: { xs: 'block', sm: 'none' } }}
          >
            {drawer}
          </Drawer>

          {/* Main content */}
          <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
            {/* Mobile App Bar - Oceanic Theme */}
            <AppBar 
              position="sticky" 
              sx={{ 
                background: `linear-gradient(135deg, ${oceanTheme.deep}, ${oceanTheme.mid})`,
                mb: 3,
                display: { xs: 'block', sm: 'none' },
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                borderRadius: '16px',
                borderBottom: `2px solid ${oceanTheme.gold}`
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ 
                    mr: 2,
                    '&:hover': {
                      background: 'rgba(255,255,255,0.2)',
                      transform: 'rotate(90deg)',
                      transition: 'transform 0.3s ease'
                    }
                  }}
                >
                  <MenuIcon />
                </IconButton>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  background: `linear-gradient(135deg, ${oceanTheme.gold}, #FFA500)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1
                }}>
                  <AnchorIcon sx={{ color: oceanTheme.navy, fontSize: 24 }} />
                </Box>
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: '0.9rem', fontWeight: 'bold' }}>
                  KPA Health Week
                </Typography>
                <WavesIcon sx={{ color: oceanTheme.foam, fontSize: 20 }} />
              </Toolbar>
            </AppBar>

            {/* Routes */}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/data-correction" element={<DataCorrection />} />
              <Route path="/analytics" element={<AdvancedAnalytics />} />
            </Routes>
          </Box>
        </Box>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;