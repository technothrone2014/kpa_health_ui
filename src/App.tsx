// App.tsx - Fixed logout button visibility and field agent sidebar

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

function AppContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePath, setActivePath] = useState("/");
  const [showGlobalAI, setShowGlobalAI] = useState(false);
  const [aiStatus, setAiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  // Determine if user is a field agent - FIXED role checking
  const isFieldAgent = React.useMemo(() => {
    if (!user) {
      console.log('🔍 No user object');
      return false;
    }
    
    const roles = user.roles || [];
    console.log('🔍 User object:', user);
    console.log('🔍 User roles:', roles);
    console.log('🔍 Roles type:', typeof roles, Array.isArray(roles));
    
    // If roles is a string (sometimes happens), convert to array
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    // Check for all possible field agent role formats (case insensitive)
    const isFieldAgentRole = rolesArray.some((role: string) => {
      if (!role) return false;
      const lowerRole = role.toLowerCase();
      return lowerRole === 'fieldagent' || 
             lowerRole === 'field_agent' ||
             lowerRole === 'field-agent' ||
             (lowerRole.includes('field') && lowerRole.includes('agent'));
    });
    
    console.log('🔍 Is field agent?', isFieldAgentRole);
    console.log('🔍 Will sidebar be hidden?', isFieldAgentRole ? 'YES - No sidebar' : 'NO - Show sidebar');
    
    return isFieldAgentRole;
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

  // Role-based menu items (only for non-field-agents)
  const getMenuItems = () => {
    if (isFieldAgent) return [];
    return [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', nauticalIcon: '🧭' },
      { text: 'Clients', icon: <PeopleIcon />, path: '/employees', nauticalIcon: '👨‍✈️' },
      { text: 'Data Correction', icon: <DataUsageIcon />, path: '/data-correction', nauticalIcon: '⚓' },
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', nauticalIcon: '📊' },
    ];
  };

  const menuItems = getMenuItems();

  // Field Agent Header Component
  const FieldAgentHeader = () => (
    <Box sx={{
      background: `linear-gradient(135deg, ${oceanTheme.deep}, ${oceanTheme.mid})`,
      color: oceanTheme.white,
      px: { xs: 2, sm: 4 },
      py: { xs: 1.5, sm: 2 },
      borderRadius: { xs: '0 0 16px 16px', sm: '16px' },
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      borderBottom: `2px solid ${oceanTheme.gold}`,
      mb: 3
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 48,
            height: 48,
            background: `linear-gradient(135deg, ${oceanTheme.gold}, #FFA500)`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <AnchorIcon sx={{ color: oceanTheme.navy, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: oceanTheme.white, lineHeight: 1.2 }}>
              KPA Field Capture
            </Typography>
            <Typography variant="caption" sx={{ color: oceanTheme.foam }}>
              EAP Health Week • Field Agent Portal
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            display: { xs: 'none', sm: 'flex' }, 
            alignItems: 'center', 
            gap: 1.5,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '30px',
            px: 2,
            py: 1
          }}>
            <Box sx={{
              width: 36,
              height: 36,
              background: oceanTheme.surface,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography sx={{ color: oceanTheme.white, fontWeight: 'bold', fontSize: '14px' }}>
                {user?.FirstName?.charAt(0) || 'F'}
                {user?.LastName?.charAt(0) || 'A'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: oceanTheme.white, fontSize: '14px', fontWeight: 'bold' }}>
                {user?.FirstName} {user?.LastName}
              </Typography>
              <Box sx={{ 
                display: 'inline-block',
                px: 1,
                py: 0.25,
                background: oceanTheme.gold,
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 'bold',
                color: oceanTheme.navy,
                textTransform: 'uppercase'
              }}>
                Field Agent
              </Box>
            </Box>
          </Box>

          <IconButton
            onClick={() => setShowGlobalAI(!showGlobalAI)}
            sx={{
              background: showGlobalAI ? oceanTheme.gold : 'rgba(255,255,255,0.15)',
              color: showGlobalAI ? oceanTheme.navy : oceanTheme.white,
              '&:hover': {
                background: oceanTheme.gold,
                color: oceanTheme.navy
              }
            }}
          >
            <SmartToyIcon />
            {aiStatus === 'online' && (
              <Box sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: oceanTheme.surface,
                border: '1px solid white'
              }} />
            )}
          </IconButton>

          <IconButton
            onClick={handleLogout}
            sx={{
              background: 'rgba(255,255,255,0.15)',
              color: oceanTheme.white,
              '&:hover': {
                background: oceanTheme.danger,
                color: oceanTheme.white
              }
            }}
            title="Logout"
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ 
        display: { xs: 'flex', sm: 'none' }, 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mt: 1.5,
        pt: 1.5,
        borderTop: `1px solid ${oceanTheme.gold}30`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 32,
            height: 32,
            background: oceanTheme.surface,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography sx={{ color: oceanTheme.white, fontWeight: 'bold', fontSize: '12px' }}>
              {user?.FirstName?.charAt(0) || 'F'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: oceanTheme.white, fontSize: '13px', fontWeight: 'bold' }}>
              {user?.FirstName} {user?.LastName}
            </Typography>
            <Box sx={{ 
              display: 'inline-block',
              px: 1,
              py: 0.25,
              background: oceanTheme.gold,
              borderRadius: '10px',
              fontSize: '9px',
              fontWeight: 'bold',
              color: oceanTheme.navy
            }}>
              Field Agent
            </Box>
          </Box>
        </Box>
        <Typography sx={{ color: oceanTheme.foam, fontSize: '11px' }}>
          {user?.Email}
        </Typography>
      </Box>
    </Box>
  );

  // Regular Sidebar Drawer (for non-field-agents)
  const drawer = (
    <Box sx={{ 
      height: '100vh', 
      background: `linear-gradient(180deg, ${oceanTheme.navy} 0%, ${oceanTheme.deep} 50%, ${oceanTheme.mid} 100%)`,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: '100px',
        background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${oceanTheme.surface}10 10px, ${oceanTheme.surface}20 20px)`,
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        background: `radial-gradient(circle at 20% 50%, ${oceanTheme.foam}05 0%, transparent 50%)`,
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        position: 'relative',
        zIndex: 1,
        pb: 10
      }}>
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

        {isAuthenticated && user && (
          <Box sx={{ p: 2, borderBottom: `1px solid ${oceanTheme.gold}30` }}>
            <Typography sx={{ color: oceanTheme.white, fontSize: '14px', fontWeight: 'bold' }}>
              {user.FirstName} {user.LastName}
            </Typography>
            <Typography sx={{ color: oceanTheme.foam, fontSize: '12px' }}>
              {user.Email}
            </Typography>
            <Box sx={{ 
              mt: 1,
              display: 'inline-block',
              px: 1.5,
              py: 0.5,
              background: oceanTheme.gold,
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: oceanTheme.navy,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Staff
            </Box>
          </Box>
        )}

        <List sx={{ px: 2, py: 2 }}>
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
                }}
              >
                <ListItemIcon sx={{ 
                  color: activePath === item.path ? oceanTheme.navy : oceanTheme.foam,
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
                    } 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
          
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
                }} />
              )}
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ 
          textAlign: 'center',
          opacity: 0.3,
          py: 2
        }}>
          <CompassCalibrationIcon sx={{ color: oceanTheme.foam, fontSize: 30 }} />
          <Typography variant="caption" sx={{ color: oceanTheme.foam, display: 'block' }}>
            Kenya Ports Authority
          </Typography>
        </Box>
      </Box>

      <Box sx={{ 
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        background: `linear-gradient(0deg, ${oceanTheme.navy} 0%, ${oceanTheme.navy} 50%, transparent 100%)`,
        zIndex: 2,
        borderTop: `1px solid ${oceanTheme.gold}30`
      }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{
            borderRadius: '12px',
            py: 1.5,
            px: 2,
            background: 'rgba(255,255,255,0.05)',
            '&:hover': {
              background: `linear-gradient(135deg, ${oceanTheme.danger}40, ${oceanTheme.danger}20)`,
            }
          }}>
            <ListItemIcon sx={{ color: oceanTheme.foam }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Logout" 
              sx={{ '& .MuiTypography-root': { color: oceanTheme.white, fontWeight: 'bold' } }} 
            />
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
      `}</style>
    </Box>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 🎯 FIELD AGENT LAYOUT - COMPLETELY SEPARATE, NO SIDEBAR AT ALL
  if (isAuthenticated && isFieldAgent) {
    console.log('🎯 Rendering FIELD AGENT layout - NO SIDEBAR, NO DRAWER');
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
        <Box component="main" sx={{ flexGrow: 1, width: '100%' }}>
          <FieldAgentHeader />
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Routes>
              <Route path="/login" element={<Navigate to="/field-capture" replace />} />
              <Route path="/dashboard" element={<Navigate to="/field-capture" replace />} />
              <Route path="/employees" element={<Navigate to="/field-capture" replace />} />
              <Route path="/data-correction" element={<Navigate to="/field-capture" replace />} />
              <Route path="/analytics" element={<Navigate to="/field-capture" replace />} />
              <Route path="/field-capture" element={
                <ProtectedRoute>
                  <DataCaptureDashboard 
                    userRole="field_agent"
                    userId={user?.Id || 0}
                    stationId={user?.StationId || 1}
                  />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/field-capture" replace />} />
              <Route path="*" element={<Navigate to="/field-capture" replace />} />
            </Routes>
          </Box>
        </Box>
        {showGlobalAI && <AIAssistant onClose={() => setShowGlobalAI(false)} />}
      </Box>
    );
  }

  // 🎯 STAFF/ADMIN LAYOUT - WITH SIDEBAR
  console.log('🎯 Rendering STAFF/ADMIN layout - WITH SIDEBAR');
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* Desktop Sidebar */}
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
        sx={{ 
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: 280 }
        }}
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
                sx={{ mr: 2 }}
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
              <IconButton
                color="inherit"
                onClick={handleLogout}
                sx={{ ml: 1 }}
                title="Logout"
              >
                <LogoutIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}

        {/* Routes for Staff/Admin */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
          <Route path="/data-correction" element={<ProtectedRoute><DataCorrection /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AdvancedAnalytics /></ProtectedRoute>} />
          <Route path="/field-capture" element={
            <ProtectedRoute>
              <DataCaptureDashboard 
                userRole="lab_assistant"
                userId={user?.Id || 0}
                stationId={user?.StationId || 1}
              />
            </ProtectedRoute>
          } />
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </Box>

      {showGlobalAI && <AIAssistant onClose={() => setShowGlobalAI(false)} />}
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