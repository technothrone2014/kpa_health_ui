import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Briefcase, Activity, TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { getDashboardStats, getEmployeeTrends } from "../api/analytics";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";

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
    {
      title: "Total Employees",
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: "blue" as const,
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Active Employees",
      value: stats?.activeEmployees || 0,
      icon: Users,
      color: "green" as const,
      trend: { value: 8, isPositive: true },
    },
    {
      title: "Stations",
      value: stats?.totalStations || 0,
      icon: Building2,
      color: "purple" as const,
    },
    {
      title: "Categories",
      value: stats?.totalCategories || 0,
      icon: Briefcase,
      color: "orange" as const,
    },
    {
      title: "Today's Tallies",
      value: stats?.todayTallies || 0,
      icon: Activity,
      color: "red" as const,
      trend: { value: 5, isPositive: true },
    },
    {
      title: "Weekly Tallies",
      value: stats?.weeklyTallies || 0,
      icon: Calendar,
      color: "indigo" as const,
      trend: { value: 3, isPositive: false },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening with your health data today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statItems.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Employee Trends */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Employee Registration Trends</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthName" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">New employee registered</p>
                  <p className="text-xs text-gray-500">{format(subDays(new Date(), i), "PP")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
