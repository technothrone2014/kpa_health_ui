import { TextField, Button, Paper, Typography, CircularProgress, Box } from "@mui/material";
import { useState } from "react";
import { runCorrection } from "../api/dataCorrection";

export default function DataCorrection() {
  const [form, setForm] = useState({
    year: 2025,
    month: 11,
    day: 19,
    userId: 39,
    stationId: 17,
    beforeHour: 8,
    beforeMinute: 52,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = await runCorrection(form);
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 600, margin: "auto" }}>
      <Typography variant="h6" mb={2}>
        Station Data Correction
      </Typography>

      {/* ✅ Replaced Grid with Box-based CSS Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
        }}
      >
        {Object.entries(form).map(([key, value]) => (
          <TextField
            key={key}
            name={key}
            label={key}
            type="number"
            fullWidth
            value={value}
            onChange={handleChange}
          />
        ))}
      </Box>

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 3 }}
        fullWidth
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Run Correction"}
      </Button>

      {result && (
        <Paper sx={{ p: 2, mt: 3, backgroundColor: "#f5f5f5" }}>
          <Typography variant="body2">
            {result.error ? `❌ ${result.error}` : `✅ ${result.message}`}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
}
