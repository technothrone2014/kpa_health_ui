import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Briefcase, Activity, TrendingUp, Award, Heart, Shield, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardOverview, getEmployeeBloodPressureResults, getEmployeeBMIResults } from "../api/analytics";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { Box, Typography, Paper, Avatar, Divider, Alert, AlertTitle, Fade, Zoom, Grow } from "@mui/material";

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

// Animation delay helper
const getDelay = (index: number) => `${index * 100}ms`;

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch real data from backend
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  const { data: bloodPressure, isLoading: bpLoading, refetch: refetchBP } = useQuery({
    queryKey: ["blood-pressure"],
    queryFn: () => getEmployeeBloodPressureResults(),
  });

  const { data: bmi, isLoading: bmiLoading, refetch: refetchBMI } = useQuery({
    queryKey: ["bmi"],
    queryFn: () => getEmployeeBMIResults(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOverview(), refetchBP(), refetchBMI()]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (overviewLoading || bpLoading || bmiLoading) {
    return <LoadingSpinner />;
  }

  // Calculate stats from real data
  const categoryDist = overview?.categoryDistribution || [];
  const getCount = (item: any) => {
    if (!item) return 0;
    const count = item.Count !== undefined ? item.Count : item.count;
    return typeof count === 'string' ? parseInt(count, 10) : (count || 0);
  };
  
  const totalEmployees = getCount(categoryDist.find(c => c.Category === 'EMPLOYEE')) || 0;
  const totalDependants = getCount(categoryDist.find(c => c.Category === 'DEPENDENT')) || 0;
  const totalPortUsers = getCount(categoryDist.find(c => c.Category === 'PORT USER')) || 0;
  const totalBPReadings = bloodPressure?.reduce((sum, item) => sum + (Number(item.Count) || 0), 0) || 0;
  const normalBP = bloodPressure?.find(item => item.BloodPressureCategory === 'NORMAL')?.Count || 0;
  const healthCoverage = totalEmployees > 0 && totalBPReadings > 0 
    ? ((Number(normalBP) / totalBPReadings) * 100).toFixed(1) : "0";

  const statItems = [
    { title: "Total Employees", value: totalEmployees, icon: Users, color: "primary" as const, trend: { value: 12, isPositive: true } },
    { title: "Total Dependants", value: totalDependants, icon: Shield, color: "success" as const, trend: { value: 5, isPositive: true } },
    { title: "Port Users", value: totalPortUsers, icon: Building2, color: "secondary" as const, trend: { value: 3, isPositive: true } },
    { title: "Total Visits", value: overview?.totalVisits || 0, icon: Activity, color: "accent" as const, trend: { value: 8, isPositive: true } },
    { title: "Normal BP", value: Number(normalBP), icon: Heart, color: "success" as const, trend: { value: 5, isPositive: true } },
    { title: "Health Coverage", value: `${healthCoverage}%`, icon: Award, color: "primary" as const, trend: { value: 2, isPositive: true } },
  ];

  const categoryData = [
    { name: 'EMPLOYEES', value: totalEmployees, color: kpaColors.primary },
    { name: 'DEPENDANTS', value: totalDependants, color: kpaColors.secondary },
    { name: 'PORT USERS', value: totalPortUsers, color: kpaColors.accent },
  ].filter(item => item.value > 0);

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

  const bmiData = bmi?.map(item => ({
    name: item.BMICategory,
    value: Number(item.Count),
  })).filter(item => item.value > 0) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'white', p: 1.5, border: `1px solid ${kpaColors.primary}`, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="body2" fontWeight="bold" color={kpaColors.primary}>{label}</Typography>
          <Typography variant="body2">Count: <span style={{ fontWeight: 'bold', color: kpaColors.accent }}>{payload[0].value}</span></Typography>
        </Box>
      );
    }
    return null;
  };

  const recentActivities = [
    { id: 1, message: "New employee registered", date: subDays(new Date(), 1), type: "employee" },
    { id: 2, message: "Blood pressure screening completed", date: subDays(new Date(), 2), type: "screening" },
    { id: 3, message: "BMI data updated", date: subDays(new Date(), 3), type: "update" },
    { id: 4, message: "Health week report generated", date: subDays(new Date(), 4), type: "report" },
  ];

  return (
    <Box sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Header with Refresh Button */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold', 
                color: kpaColors.primary, 
                borderLeft: `4px solid ${kpaColors.gold}`, 
                pl: 2, 
                mb: 1,
                fontFamily: 'Verdana, Geneva, sans-serif'
              }}
            >
              Welcome Back, Captain!
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', ml: 2, fontFamily: 'Verdana, Geneva, sans-serif' }}>
              Here's your EAP Health Week Intelligence Dashboard
            </Typography>
          </Box>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: kpaColors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              opacity: refreshing ? 0.7 : 1,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = kpaColors.secondary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = kpaColors.primary}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </Box>
      </Fade>

      {/* Stats Grid with Staggered Animation */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px' 
      }}>
        {statItems.map((stat, index) => (
          <Grow in timeout={500} style={{ transitionDelay: getDelay(index) }} key={stat.title}>
            <div>
              <StatCard {...stat} />
            </div>
          </Grow>
        ))}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Blood Pressure Distribution - Pie Chart */}
        <Zoom in timeout={600}>
          <Paper elevation={0} sx={{ 
            p: 3, 
            borderRadius: 3, 
            border: `1px solid ${kpaColors.light}`, 
            background: 'white',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold" color={kpaColors.dark} sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                  Blood Pressure Distribution
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                  Employee BP categories
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}>
                <Heart />
              </Avatar>
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
        </Zoom>

        {/* Client Categories Distribution - Pie Chart */}
        <Zoom in timeout={700}>
          <Paper elevation={0} sx={{ 
            p: 3, 
            borderRadius: 3, 
            border: `1px solid ${kpaColors.light}`, 
            background: 'white', 
            height: '100%',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold" color={kpaColors.dark} sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                  Client Categories
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                  Distribution by category
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}>
                <Award />
              </Avatar>
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
                    Raw data: Employees: {totalEmployees}, Dependants: {totalDependants}, Port Users: {totalPortUsers}
                  </Typography>
                </Alert>
              </Box>
            )}
          </Paper>
        </Zoom>
      </div>

      {/* BMI Distribution - Bar Chart */}
      <Zoom in timeout={800}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
          <Paper elevation={0} sx={{ 
            p: 3, 
            borderRadius: 3, 
            border: `1px solid ${kpaColors.light}`, 
            background: 'white',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold" color={kpaColors.dark} sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                  BMI Distribution
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                  Employee BMI categories
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}>
                <Activity />
              </Avatar>
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
                    <Bar dataKey="value" fill={kpaColors.primary} radius={[0, 8, 8, 0]} />
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
      </Zoom>

      {/* Recent Activity */}
      <Fade in timeout={900}>
        <Paper elevation={0} sx={{ 
          p: 3, 
          borderRadius: 3, 
          border: `1px solid ${kpaColors.light}`, 
          background: 'white',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color={kpaColors.dark} sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
                Latest updates from your health data
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}>
              <Activity />
            </Avatar>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivities.map((activity, index) => (
              <Grow in timeout={500} style={{ transitionDelay: getDelay(index + 5) }} key={activity.id}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 2, 
                  bgcolor: kpaColors.light, 
                  borderRadius: 2, 
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': { 
                    bgcolor: kpaColors.primary, 
                    transform: 'translateX(8px)',
                    '& .MuiTypography-root': { color: 'white' },
                    '& .MuiTypography-caption': { color: 'rgba(255,255,255,0.8)' }
                  } 
                }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: kpaColors.success, mr: 2, animation: 'pulse 2s infinite' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ transition: 'color 0.3s ease' }}>
                      {activity.message}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ transition: 'color 0.3s ease' }}>
                      {format(activity.date, "PPPP")}
                    </Typography>
                  </Box>
                  <Typography variant="caption" fontWeight="bold" sx={{ color: kpaColors.primary, transition: 'color 0.3s ease' }}>
                    View Details →
                  </Typography>
                </Box>
              </Grow>
            ))}
          </div>
        </Paper>
      </Fade>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </Box>
  );
}