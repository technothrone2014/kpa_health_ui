import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Employees from "./pages/Employees";
import DataCorrection from "./pages/DataCorrection";
import { AppBar, Toolbar, Button, Container, Typography } from "@mui/material";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Simple Top Navigation */}
        <AppBar position="static" color="primary" sx={{ mb: 4 }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              🩺 KPA Health Dashboard
            </Typography>
            <Button color="inherit" component={Link} to="/">
              Employees
            </Button>
            <Button color="inherit" component={Link} to="/data-correction">
              Data Correction
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md">
          <Routes>
            <Route path="/" element={<Employees />} />
            <Route path="/data-correction" element={<DataCorrection />} />
          </Routes>
        </Container>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
