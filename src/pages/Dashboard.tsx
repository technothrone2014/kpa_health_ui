import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Briefcase, Activity, TrendingUp, Award, Heart, Shield, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardOverview, getEmployeeBloodPressureResults, getEmployeeBMIResults } from "../api/analytics";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { Box, Typography, Paper, Avatar, Divider, Alert, AlertTitle } from "@mui/material";

// KPA Theme Colors
const kpaColors = {
  primary: '#0033A0',
  secondary: '#0055B8',
  accent: '#00A3E0',
  gold: '#FFD700',
  dark: '#002266',
  light: '#E8F0FE',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export default function Dashboard() {
  // Fetch real data from backend
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  const { data: bloodPressure, isLoading: bpLoading, error: bpError } = useQuery({
    queryKey: ["blood-pressure"],
    queryFn: () => getEmployeeBloodPressureResults(),
  });

  const { data: bmi, isLoading: bmiLoading, error: bmiError } = useQuery({
    queryKey: ["bmi"],
    queryFn: () => getEmployeeBMIResults(),
  });

  // Debug logging
  React.useEffect(() => {
    console.log("=== DASHBOARD DATA DEBUG ===");
    console.log("Overview:", overview);
    console.log("Category Distribution:", overview?.categoryDistribution);
    console.log("Blood Pressure:", bloodPressure);
    console.log("BMI:", bmi);
    
    if (overview?.categoryDistribution) {
      overview.categoryDistribution.forEach((cat, idx) => {
        console.log(`Category ${idx}:`, cat);
      });
    }
  }, [overview, bloodPressure, bmi]);

  if (overviewLoading || bpLoading || bmiLoading) {
    return <LoadingSpinner />;
  }

  // Calculate stats from real data - handle both string and number counts
  const categoryDist = overview?.categoryDistribution || [];
  
  // Helper to get count (handles string or number)
  const getCount = (item: any) => {
    if (!item) return 0;
    const count = item.Count !== undefined ? item.Count : item.count;
    return typeof count === 'string' ? parseInt(count, 10) : (count || 0);
  };
  
  const totalEmployees = getCount(categoryDist.find(c => c.Category === 'EMPLOYEE')) || 0;
  const totalDependants = getCount(categoryDist.find(c => c.Category === 'DEPENDENT')) || 0;
  const totalPortUsers = getCount(categoryDist.find(c => c.Category === 'PORT USER')) || 0;
  
  console.log("Parsed values:", { totalEmployees, totalDependants, totalPortUsers });
  
  // Calculate total blood pressure readings
  const totalBPReadings = bloodPressure?.reduce((sum, item) => sum + (Number(item.Count) || 0), 0) || 0;
  
  // Get normal blood pressure count
  const normalBP = bloodPressure?.find(item => item.BloodPressureCategory === 'NORMAL')?.Count || 0;
  
  // Calculate health coverage percentage
  const healthCoverage = totalEmployees > 0 && totalBPReadings > 0 
    ? ((Number(normalBP) / totalBPReadings) * 100).toFixed(1) 
    : "0";

  const statItems = [
    { title: "Total Employees", value: totalEmployees, icon: Users, color: "primary" as const },
    { title: "Total Dependants", value: totalDependants, icon: Shield, color: "success" as const },
    { title: "Port Users", value: totalPortUsers, icon: Building2, color: "secondary" as const },
    { title: "Total Visits", value: overview?.totalVisits || 0, icon: Activity, color: "accent" as const },
    { title: "Normal BP", value: Number(normalBP), icon: Heart, color: "success" as const, trend: { value: 5, isPositive: true } },
    { title: "Health Coverage", value: `${healthCoverage}%`, icon: Award, color: "primary" as const, trend: { value: 2, isPositive: true } },
  ];

  // Category distribution for pie chart - ensure we have valid data
  const categoryData = [
    { name: 'EMPLOYEES', value: totalEmployees, color: kpaColors.primary },
    { name: 'DEPENDANTS', value: totalDependants, color: kpaColors.secondary },
    { name: 'PORT USERS', value: totalPortUsers, color: kpaColors.accent },
  ].filter(item => item.value > 0);

  console.log("Category Data for Pie Chart:", categoryData);

  // Blood pressure distribution with proper color mapping
  const bpColorMap: Record<string, string> = {
    'NORMAL': kpaColors.success,
    'PRE-HYPERTENSION': kpaColors.warning,
    'STAGE I HYPERTENSION': kpaColors.danger,
    'STAGE II HYPERTENSION': '#9B2C2C',
    'HYPOTENSION': '#8B4513',
  };

  const bpData = bloodPressure?.map(item => ({
    name: item.BloodPressureCategory,
    value: Number(item.Count),
    color: bpColorMap[item.BloodPressureCategory] || kpaColors.accent,
  })).filter(item => item.value > 0) || [];

  // BMI data for bar chart
  const bmiData = bmi?.map(item => ({
    name: item.BMICategory,
    value: Number(item.Count),
  })).filter(item => item.value > 0) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'white', p: 1.5, border: `1px solid ${kpaColors.primary}`, borderRadius: 1, boxShadow: 2 }}>
          <Typography variant="body2" fontWeight="bold" color={kpaColors.primary}>{label}</Typography>
          <Typography variant="body2">Count: <span style={{ fontWeight: 'bold', color: kpaColors.accent }}>{payload[0].value}</span></Typography>
        </Box>
      );
    }
    return null;
  };

  // Sample recent activity (replace with real data from an activity endpoint)
  const recentActivities = [
    { id: 1, message: "New employee registered - John Doe", date: subDays(new Date(), 1), type: "employee" },
    { id: 2, message: "Blood pressure screening completed", date: subDays(new Date(), 2), type: "screening" },
    { id: 3, message: "BMI data updated", date: subDays(new Date(), 3), type: "update" },
    { id: 4, message: "Health week report generated", date: subDays(new Date(), 4), type: "report" },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: kpaColors.primary, borderLeft: `4px solid ${kpaColors.gold}`, pl: 2, mb: 1 }}>
          Welcome Back, Captain!
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', ml: 2 }}>
          Here's your EAP Health Week Intelligence Dashboard
        </Typography>
      </Box>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {statItems.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Blood Pressure Distribution - Pie Chart */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${kpaColors.light}`, background: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color={kpaColors.dark}>Blood Pressure Distribution</Typography>
              <Typography variant="body2" color="textSecondary">Employee BP categories</Typography>
            </Box>
            <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}><Heart /></Avatar>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {bpData.length > 0 ? (
            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={bpData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={5} 
                    dataKey="value" 
                    label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`} 
                    labelLine={false}
                  >
                    {bpData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Alert severity="info" sx={{ maxWidth: 400 }}>
                <AlertTitle>No Data Available</AlertTitle>
                No blood pressure data found for the selected period.
              </Alert>
            </Box>
          )}
        </Paper>

        {/* Client Categories Distribution - Pie Chart */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${kpaColors.light}`, background: 'white', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color={kpaColors.dark}>Client Categories</Typography>
              <Typography variant="body2" color="textSecondary">Distribution by category</Typography>
            </Box>
            <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}><Award /></Avatar>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {categoryData.length > 0 ? (
            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={categoryData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={5} 
                    dataKey="value" 
                    label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`} 
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Alert severity="warning" sx={{ maxWidth: 400 }}>
                <AlertTitle>No Category Data</AlertTitle>
                <Typography variant="body2">
                  No client category data available.<br />
                  Raw data: Employees: {totalEmployees}, Dependants: {totalDependants}, Port Users: {totalPortUsers}
                </Typography>
              </Alert>
            </Box>
          )}
        </Paper>
      </div>

      {/* BMI Distribution - Bar Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${kpaColors.light}`, background: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color={kpaColors.dark}>BMI Distribution</Typography>
              <Typography variant="body2" color="textSecondary">Employee BMI categories</Typography>
            </Box>
            <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}><Activity /></Avatar>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {bmiData.length > 0 ? (
            <Box sx={{ height: 400, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bmiData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill={kpaColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Alert severity="info">
                <AlertTitle>No BMI Data</AlertTitle>
                No BMI data found for the selected period.
              </Alert>
            </Box>
          )}
        </Paper>
      </div>

      {/* Recent Activity */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${kpaColors.light}`, background: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" color={kpaColors.dark}>Recent Activity</Typography>
            <Typography variant="body2" color="textSecondary">Latest updates from your health data</Typography>
          </Box>
          <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}><Activity /></Avatar>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentActivities.map((activity) => (
            <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: kpaColors.light, borderRadius: 2, transition: 'all 0.3s', '&:hover': { bgcolor: kpaColors.primary, '& .MuiTypography-root': { color: 'white' } } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: kpaColors.success, mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">{activity.message}</Typography>
                <Typography variant="caption" color="textSecondary">{format(activity.date, "PPPP")}</Typography>
              </Box>
              <Typography variant="caption" fontWeight="bold" color={kpaColors.primary}>View Details →</Typography>
            </Box>
          ))}
        </div>
      </Paper>
    </Box>
  );
}
