import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Briefcase, Activity, TrendingUp, Calendar, Award, Heart, Shield } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardStats, getEmployeeTrends } from "../api/analytics";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { Box, Typography, Paper, Avatar, Divider } from "@mui/material";

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
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["employee-trends"],
    queryFn: () => getEmployeeTrends("month"),
  });

  if (statsLoading || trendsLoading) {
    return <LoadingSpinner />;
  }

  const statItems = [
    { title: "Total Employees", value: stats?.totalEmployees || 0, icon: Users, color: "primary" as const, trend: { value: 12, isPositive: true } },
    { title: "Active Employees", value: stats?.activeEmployees || 0, icon: Shield, color: "success" as const, trend: { value: 8, isPositive: true } },
    { title: "Stations", value: stats?.totalStations || 0, icon: Building2, color: "secondary" as const },
    { title: "Categories", value: stats?.totalCategories || 0, icon: Briefcase, color: "accent" as const },
    { title: "Today's Tallies", value: stats?.todayTallies || 0, icon: Activity, color: "warning" as const, trend: { value: 5, isPositive: true } },
    { title: "Health Coverage", value: "94.5%", icon: Heart, color: "danger" as const, trend: { value: 2, isPositive: true } },
  ];

  const categoryData = [
    { name: 'EMPLOYEES', value: stats?.totalEmployees || 1247, color: kpaColors.primary },
    { name: 'DEPENDANTS', value: 342, color: kpaColors.secondary },
    { name: 'PORT USERS', value: 156, color: kpaColors.accent },
  ];

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

  return (
    <Box>
      {/* Header with KPA branding */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: kpaColors.primary, borderLeft: `4px solid ${kpaColors.gold}`, pl: 2, mb: 1 }}>
          Welcome Back, Captain!
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', ml: 2 }}>
          Here's your EAP Health Week Intelligence Dashboard
        </Typography>
      </Box>

      {/* Stats Grid - Using CSS Grid instead of MUI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {statItems.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section - Using CSS Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Employee Trends Line Chart */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${kpaColors.light}`, background: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color={kpaColors.dark}>Employee Registration Trends</Typography>
              <Typography variant="body2" color="textSecondary">Monthly registration overview</Typography>
            </Box>
            <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}><TrendingUp /></Avatar>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="monthName" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke={kpaColors.primary} strokeWidth={3} dot={{ fill: kpaColors.primary, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: kpaColors.gold, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Category Distribution Pie Chart */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${kpaColors.light}`, background: 'white', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold" color={kpaColors.dark}>Client Categories</Typography>
              <Typography variant="body2" color="textSecondary">Distribution by category</Typography>
            </Box>
            <Avatar sx={{ bgcolor: kpaColors.light, color: kpaColors.primary }}><Award /></Avatar>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
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
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: kpaColors.light, borderRadius: 2, transition: 'all 0.3s', '&:hover': { bgcolor: kpaColors.primary, '& .MuiTypography-root': { color: 'white' } } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: kpaColors.success, mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">New employee registered</Typography>
                <Typography variant="caption" color="textSecondary">{format(subDays(new Date(), i), "PPPP")}</Typography>
              </Box>
              <Typography variant="caption" fontWeight="bold" color={kpaColors.primary}>View Details →</Typography>
            </Box>
          ))}
        </div>
      </Paper>
    </Box>
  );
}