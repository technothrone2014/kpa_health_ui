import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Employees from "./pages/Employees";
import DataCorrection from "./pages/DataCorrection";
import Dashboard from "./pages/Dashboard";
import { 
  AppBar, Toolbar, Typography, Box, IconButton, Drawer, 
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
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState, useEffect } from "react";
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AIAssistant from './components/AIAssistant';
import aiService from './api/aiService';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoadingSpinner from "./components/LoadingSpinner";
import Login from "./pages/Login";
import DataCaptureDashboard from './components/DataCaptureDashboard';
import React from "react";

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
  danger: '#EF4444',
};

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Role-based redirect component
function RoleBasedRedirect() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is a field agent
  const roles = user.roles || [];
  const normalizedRoles = roles.map(r => r.toLowerCase());
  const isFieldAgent = normalizedRoles.includes('fieldagent') || 
                       normalizedRoles.includes('field_agent');
  
  if (isFieldAgent) {
    return <Navigate to="/field-capture" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
}

// Main App Content (requires auth context)
function AppContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePath, setActivePath] = useState("/");
  const [showGlobalAI, setShowGlobalAI] = useState(false);
  const [aiStatus, setAiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  // Determine if user is a field agent
  const isFieldAgent = React.useMemo(() => {
    if (!user?.roles) return false;
    const roles = user.roles || [];
    const normalizedRoles = roles.map((r: string) => r.toLowerCase());
    return normalizedRoles.includes('fieldagent') || 
           normalizedRoles.includes('field_agent');
  }, [user]);

  // Check AI service health on mount
  useEffect(() => {
    const checkAIHealth = async () => {
      try {
        const health = await aiService.checkHealth();
        setAiStatus(health.status === 'ok' ? 'online' : 'offline');
      } catch (error) {
        setAiStatus('offline');
      }
    };
    checkAIHealth();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Role-based menu items
  const getMenuItems = () => {
    if (isFieldAgent) {
      // Field agents only see field capture
      return [
        { text: 'Field Capture', icon: <PeopleIcon />, path: '/field-capture', nauticalIcon: '📋' },
      ];
    }
    
    // Regular users see full menu
    return [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', nauticalIcon: '🧭' },
      { text: 'Clients', icon: <PeopleIcon />, path: '/employees', nauticalIcon: '👨‍✈️' },
      { text: 'Data Correction', icon: <DataUsageIcon />, path: '/data-correction', nauticalIcon: '⚓' },
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', nauticalIcon: '📊' },
    ];
  };

  const menuItems = getMenuItems();

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

      {/* User Info with Role Badge */}
      {isAuthenticated && user && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${oceanTheme.gold}30`, mb: 2 }}>
          <Typography sx={{ color: oceanTheme.white, fontSize: '14px', fontWeight: 'bold' }}>
            {user.FirstName} {user.LastName}
          </Typography>
          <Typography sx={{ color: oceanTheme.foam, fontSize: '12px' }}>
            {user.Email}
          </Typography>
          {/* Role Badge */}
          <Box sx={{ 
            mt: 1,
            display: 'inline-block',
            px: 1.5,
            py: 0.5,
            background: isFieldAgent ? oceanTheme.surface : oceanTheme.gold,
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: isFieldAgent ? oceanTheme.white : oceanTheme.navy,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {isFieldAgent ? 'Field Agent' : 'Staff'}
          </Box>
        </Box>
      )}

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
        
        {/* AI Assistant Menu Item - Available to all roles */}
        <ListItem disablePadding sx={{ mb: 1, mt: 2 }}>
          <ListItemButton 
            onClick={() => setShowGlobalAI(!showGlobalAI)}
            sx={{
              borderRadius: '12px',
              py: 1.5,
              px: 2,
              transition: 'all 0.3s ease',
              background: showGlobalAI 
                ? `linear-gradient(135deg, ${oceanTheme.gold}, #FFA500)`
                : 'transparent',
              '&:hover': {
                background: `linear-gradient(135deg, ${oceanTheme.gold}40, #FFA50040)`,
                transform: 'translateX(8px)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: showGlobalAI ? oceanTheme.navy : oceanTheme.foam,
            }}>
              <SmartToyIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Sister Unesi AI" 
              sx={{ 
                '& .MuiTypography-root': { 
                  color: showGlobalAI ? oceanTheme.navy : oceanTheme.white,
                  fontWeight: showGlobalAI ? 'bold' : 'normal',
                } 
              }} 
            />
            {aiStatus === 'online' && (
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: oceanTheme.surface,
                ml: 1,
                animation: 'pulse 2s infinite'
              }} />
            )}
            {aiStatus === 'offline' && (
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: oceanTheme.danger,
                ml: 1
              }} />
            )}
          </ListItemButton>
        </ListItem>
      </List>

      {/* Decorative Compass Rose */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 80, 
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

      {/* Logout Button */}
      <Box sx={{ position: 'absolute', bottom: 20, left: 0, right: 0, px: 2 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{
            borderRadius: '12px',
            py: 1.5,
            px: 2,
            '&:hover': {
              background: `linear-gradient(135deg, ${oceanTheme.danger}40, ${oceanTheme.danger}20)`,
            }
          }}>
            <ListItemIcon sx={{ color: oceanTheme.foam }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ '& .MuiTypography-root': { color: oceanTheme.white } }} />
          </ListItemButton>
        </ListItem>
      </Box>

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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* Desktop Sidebar - Only show when authenticated */}
      {isAuthenticated && (
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
      )}

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
        {/* Mobile App Bar */}
        {isAuthenticated && (
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
                {isFieldAgent ? 'Field Capture' : 'KPA Health Week'}
              </Typography>
              <button
                onClick={() => setShowGlobalAI(!showGlobalAI)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <SmartToyIcon sx={{ fontSize: 18 }} />
              </button>
              <WavesIcon sx={{ color: oceanTheme.foam, fontSize: 20, ml: 1 }} />
            </Toolbar>
          </AppBar>
        )}

        {/* Routes */}
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes - Regular users */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {isFieldAgent ? <Navigate to="/field-capture" replace /> : <Dashboard />}
            </ProtectedRoute>
          } />
          
          <Route path="/employees" element={
            <ProtectedRoute>
              {isFieldAgent ? <Navigate to="/field-capture" replace /> : <Employees />}
            </ProtectedRoute>
          } />
          
          <Route path="/data-correction" element={
            <ProtectedRoute>
              {isFieldAgent ? <Navigate to="/field-capture" replace /> : <DataCorrection />}
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              {isFieldAgent ? <Navigate to="/field-capture" replace /> : <AdvancedAnalytics />}
            </ProtectedRoute>
          } />
          
          {/* Field Capture - Accessible to all authenticated users */}
          <Route path="/field-capture" element={
            <ProtectedRoute>
              <DataCaptureDashboard 
                userRole={isFieldAgent ? 'field_agent' : 'lab_assistant'}
                userId={user?.Id || 0}
                stationId={user?.StationId || 1}
              />
            </ProtectedRoute>
          } />
          
          {/* Root route - Role-based redirect */}
          <Route path="/" element={<RoleBasedRedirect />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </Box>

      {/* Global AI Assistant */}
      {showGlobalAI && (
        <AIAssistant onClose={() => setShowGlobalAI(false)} />
      )}
    </Box>
  );
}

// Main App component with AuthProvider
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;