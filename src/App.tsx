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
import { useState } from "react";

const queryClient = new QueryClient();

// KPA Color Theme
const kpaTheme = {
  primary: '#0033A0',    // KPA Deep Blue
  secondary: '#0055B8',  // KPA Bright Blue
  accent: '#00A3E0',     // KPA Light Blue
  gold: '#FFD700',       // KPA Gold accent
  dark: '#002266',       // Dark Navy
  light: '#E8F0FE',      // Light blue background
};

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Employees', icon: <PeopleIcon />, path: '/employees' },
    { text: 'Data Correction', icon: <DataUsageIcon />, path: '/data-correction' },
  ];

  const drawer = (
    <Box sx={{ backgroundColor: kpaTheme.dark, height: '100%' }}>
      <Box sx={{ p: 3, textAlign: 'center', borderBottom: `1px solid ${kpaTheme.accent}` }}>
        <img 
          src="/KPA Logo.png" 
          alt="Kenya Ports Authority" 
          style={{ height: 50, width: 'auto' }}
        />
        <Typography variant="subtitle2" sx={{ color: kpaTheme.gold, mt: 1 }}>
          EAP Health Week Intelligence
        </Typography>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                '&:hover': {
                  backgroundColor: kpaTheme.primary,
                },
                '&.active': {
                  backgroundColor: kpaTheme.primary,
                }
              }}
            >
              <ListItemIcon sx={{ color: kpaTheme.gold }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} sx={{ color: 'white' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
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
            <Box sx={{ width: 280, position: 'fixed', height: '100vh', backgroundColor: kpaTheme.dark }}>
              <Box sx={{ p: 3, textAlign: 'center', borderBottom: `1px solid ${kpaTheme.accent}` }}>
                <img 
                  src="/KPA Logo.png" 
                  alt="Kenya Ports Authority" 
                  style={{ height: 60, width: 'auto' }}
                />
                <Typography variant="subtitle2" sx={{ color: kpaTheme.gold, mt: 1 }}>
                  EAP Health Week Intelligence
                </Typography>
              </Box>
              <List>
                {menuItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton 
                      component={Link} 
                      to={item.path}
                      sx={{
                        '&:hover': {
                          backgroundColor: kpaTheme.primary,
                        },
                        '&.active': {
                          backgroundColor: kpaTheme.primary,
                        }
                      }}
                    >
                      <ListItemIcon sx={{ color: kpaTheme.gold }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} sx={{ color: 'white' }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
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
            {/* Mobile App Bar */}
            <AppBar 
              position="sticky" 
              sx={{ 
                backgroundColor: kpaTheme.primary,
                mb: 3,
                display: { xs: 'block', sm: 'none' },
                boxShadow: 'none',
                borderBottom: `2px solid ${kpaTheme.gold}`
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
                <img 
                  src="/KPA Logo.png" 
                  alt="KPA" 
                  style={{ height: 35, marginRight: 10 }}
                />
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: '0.9rem' }}>
                  EAP Health Week
                </Typography>
              </Toolbar>
            </AppBar>

            {/* Routes */}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/data-correction" element={<DataCorrection />} />
            </Routes>
          </Box>
        </Box>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
