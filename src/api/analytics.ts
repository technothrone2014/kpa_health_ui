// kpa_health_ui/src/api/analytics.ts

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== TYPES ====================

// Add these interfaces near the top with other types
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalStations: number;
  totalCategories: number;
  todayTallies: number;
  weeklyTallies: number;
  monthlyTallies: number;
  attendanceRate: number;
}

export interface EmployeeTrend {
  monthName: string;
  count: number;
  date: string;
}

// Add these functions to your analytics.ts file
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Fetch real data from your backend
    const [overview, bloodPressure, bmi] = await Promise.all([
      getDashboardOverview(),
      getEmployeeBloodPressureResults(),
      getEmployeeBMIResults()
    ]);
    
    // Calculate derived stats
    const totalEmployees = overview.categoryDistribution.find(c => c.Category === 'EMPLOYEE')?.Count || 0;
    const totalStations = 45; // You might want to fetch this from a stations endpoint
    const totalCategories = 12; // You might want to fetch this from a categories endpoint
    
    // Mock today's and weekly tallies - replace with actual API calls
    const todayTallies = Math.floor(Math.random() * 100) + 50;
    const weeklyTallies = Math.floor(Math.random() * 500) + 300;
    
    return {
      totalEmployees,
      activeEmployees: Math.floor(totalEmployees * 0.9), // 90% active rate
      inactiveEmployees: Math.floor(totalEmployees * 0.1),
      totalStations,
      totalCategories,
      todayTallies,
      weeklyTallies,
      monthlyTallies: weeklyTallies * 4,
      attendanceRate: 94.5,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return mock data as fallback
    return {
      totalEmployees: 1247,
      activeEmployees: 1123,
      inactiveEmployees: 124,
      totalStations: 45,
      totalCategories: 12,
      todayTallies: 87,
      weeklyTallies: 432,
      monthlyTallies: 1728,
      attendanceRate: 94.5,
    };
  }
};

export const getEmployeeTrends = async (period: string = 'month'): Promise<EmployeeTrend[]> => {
  try {
    // This would fetch actual trend data from your backend
    // For now, return mock data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(0, currentMonth + 1).map((month, index) => ({
      monthName: month,
      count: Math.floor(Math.random() * 100) + 50,
      date: `2024-${String(index + 1).padStart(2, '0')}-01`,
    }));
  } catch (error) {
    console.error('Error fetching employee trends:', error);
    // Return mock data as fallback
    return [
      { monthName: 'Jan', count: 45, date: '2024-01-01' },
      { monthName: 'Feb', count: 52, date: '2024-02-01' },
      { monthName: 'Mar', count: 48, date: '2024-03-01' },
      { monthName: 'Apr', count: 61, date: '2024-04-01' },
      { monthName: 'May', count: 67, date: '2024-05-01' },
      { monthName: 'Jun', count: 73, date: '2024-06-01' },
    ];
  }
};

// Client summary types
export interface CategoryCount {
  Category: string;
  Count: number;
}

export interface CategoryGenderData {
  Gender: string;
  EMPLOYEES: number;
  DEPENDANTS: number;
  PORT_USERS: number;
  TOTAL: number;
}

export interface CategoryStationData {
  Station: string;
  EMP: number;
  DEP: number;
  PU: number;
  TOTAL: number;
  SortOrder?: number;
}

// Health metrics types
export interface HealthMetric {
  [key: string]: string | number;
  Count: number;
}

export interface BloodPressureData {
  BloodPressureCategory: string;
  Count: number;
}

export interface BMIData {
  BMICategory: string;
  Count: number;
}

export interface RandomBloodSugarData {
  RandomBloodSugarCategory: string;
  Count: number;
}

export interface BMDData {
  BMDResult: string;
  Count: number;
}

export interface FBSData {
  FBSResult: string;
  Count: number;
}

export interface HBA1CData {
  HBA1CResult: string;
  Count: number;
}

export interface LipidData {
  LipidResult: string;
  Count: number;
}

export interface MicroalbuminData {
  MicroalbuminResult: string;
  Count: number;
}

export interface PSAData {
  PSAResult: string;
  Count: number;
}

export interface HepatitisData {
  TestType: string;
  Result: string;
  Count: number;
}

// Oncology types
export interface BreastExamData {
  BreastExamResult: string;
  Count: number;
}

export interface PAPSmearData {
  PAPSmearResult: string;
  Count: number;
}

export interface ViaVilliData {
  ViaVilliesResult: string;
  Count: number;
}

// Dashboard types
export interface DashboardOverview {
  totalClients: number;
  totalVisits: number;
  categoryDistribution: CategoryCount[];
}

// ==================== API FUNCTIONS ====================

// Client Summary APIs
export const getClientsPerCategory = async (
  startDate?: string,
  endDate?: string
): Promise<CategoryCount[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/clients/category${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getClientsPerCategoryPerGender = async (
  startDate?: string,
  endDate?: string
): Promise<CategoryGenderData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/clients/category-gender${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getClientsPerCategoryPerStation = async (
  startDate?: string,
  endDate?: string
): Promise<CategoryStationData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/clients/category-station${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// Employee Health Metrics APIs
export const getEmployeeBloodPressureResults = async (
  startDate?: string,
  endDate?: string
): Promise<BloodPressureData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/blood-pressure${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeBMIResults = async (
  startDate?: string,
  endDate?: string
): Promise<BMIData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/bmi${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeRandomBloodSugarResults = async (
  startDate?: string,
  endDate?: string
): Promise<RandomBloodSugarData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/random-blood-sugar${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeBMDResults = async (
  startDate?: string,
  endDate?: string
): Promise<BMDData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/bmd${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeFBSResults = async (
  startDate?: string,
  endDate?: string
): Promise<FBSData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/fbs${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeHBA1CResults = async (
  startDate?: string,
  endDate?: string
): Promise<HBA1CData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/hba1c${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeLipidProfileResults = async (
  startDate?: string,
  endDate?: string
): Promise<LipidData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/lipid-profile${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeMicroalbuminResults = async (
  startDate?: string,
  endDate?: string
): Promise<MicroalbuminData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/microalbumin${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeePSAResults = async (
  startDate?: string,
  endDate?: string
): Promise<PSAData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/psa${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeHepatitisResults = async (
  startDate?: string,
  endDate?: string
): Promise<HepatitisData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/hepatitis${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// Oncology APIs
export const getEmployeeBreastExamResults = async (
  startDate?: string,
  endDate?: string
): Promise<BreastExamData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/breast-exam${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeePAPSmearResults = async (
  startDate?: string,
  endDate?: string
): Promise<PAPSmearData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/pap-smear${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

export const getEmployeeViaVilliResults = async (
  startDate?: string,
  endDate?: string
): Promise<ViaVilliData[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/employees/via-villi${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// Dashboard Overview API
export const getDashboardOverview = async (
  startDate?: string,
  endDate?: string
): Promise<DashboardOverview> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await apiClient.get(`/analytics/dashboard/overview${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// ==================== HELPER FUNCTIONS ====================

// Helper to format data for charts
export const formatChartData = (data: any[], labelKey: string, valueKey: string) => {
  return {
    labels: data.map(item => item[labelKey]),
    datasets: [
      {
        data: data.map(item => item[valueKey]),
      },
    ],
  };
};

// Helper to get color based on health metric severity
export const getHealthMetricColor = (metric: string): string => {
  const normalRanges = ['Normal', 'Optimal', 'Desirable', 'Negative', 'Non-reactive'];
  const warningRanges = ['Pre-hypertension', 'Overweight', 'Pre-diabetes', 'Borderline'];
  const criticalRanges = ['Hypertension', 'Obese', 'Diabetes', 'Positive', 'Reactive'];
  
  if (normalRanges.some(range => metric.includes(range))) {
    return 'text-green-600';
  } else if (warningRanges.some(range => metric.includes(range))) {
    return 'text-yellow-600';
  } else if (criticalRanges.some(range => metric.includes(range))) {
    return 'text-red-600';
  }
  return 'text-gray-600';
};

// Export a default object with all functions for convenience
const analyticsAPI = {
  // Client summary
  getClientsPerCategory,
  getClientsPerCategoryPerGender,
  getClientsPerCategoryPerStation,
  
  // Health metrics
  getEmployeeBloodPressureResults,
  getEmployeeBMIResults,
  getEmployeeRandomBloodSugarResults,
  getEmployeeBMDResults,
  getEmployeeFBSResults,
  getEmployeeHBA1CResults,
  getEmployeeLipidProfileResults,
  getEmployeeMicroalbuminResults,
  getEmployeePSAResults,
  getEmployeeHepatitisResults,
  
  // Oncology
  getEmployeeBreastExamResults,
  getEmployeePAPSmearResults,
  getEmployeeViaVilliResults,
  
  // Dashboard
  getDashboardOverview,
  
  // Helpers
  formatChartData,
  getHealthMetricColor,
};

export default analyticsAPI;
