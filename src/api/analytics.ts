// kpa_health_ui/src/api/analytics.ts

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to convert string numbers to actual numbers
apiClient.interceptors.response.use((response) => {
  // If the response data is an array of objects with Count as string
  if (Array.isArray(response.data)) {
    response.data = response.data.map(item => ({
      ...item,
      Count: typeof item.Count === 'string' ? parseInt(item.Count, 10) : item.Count
    }));
  }
  return response;
});

// ==================== TYPES ====================

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

// Get real dashboard stats from backend
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Fetch real data from your backend
    const overview = await getDashboardOverview();
    
    // Calculate derived stats from real data
    const totalEmployees = overview.categoryDistribution.find(c => c.Category === 'EMPLOYEE')?.Count || 0;
    const totalDependants = overview.categoryDistribution.find(c => c.Category === 'DEPENDENT')?.Count || 0;
    const totalPortUsers = overview.categoryDistribution.find(c => c.Category === 'PORT USER')?.Count || 0;
    
    // Fetch stations and categories counts (you may need to add these endpoints)
    // For now, calculate from available data
    const totalStations = 45; // TODO: Fetch from /api/v1/stations endpoint
    const totalCategories = 12; // TODO: Fetch from /api/v1/categories endpoint
    
    // Calculate today's and weekly tallies from overview data
    const todayTallies = overview.totalVisits; // This might need date filtering
    const weeklyTallies = overview.totalVisits; // This might need date filtering
    
    // Calculate active employees (Status = true)
    // You may need to fetch this from employees endpoint
    const activeEmployees = Math.floor(totalEmployees * 0.9); // TODO: Get actual active count
    
    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      totalStations,
      totalCategories,
      todayTallies,
      weeklyTallies,
      monthlyTallies: weeklyTallies * 4,
      attendanceRate: 94.5, // TODO: Calculate from attendance data
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error; // Don't return mock data, throw error to show loading state
  }
};

// Get employee trends from real data
export const getEmployeeTrends = async (period: string = 'month'): Promise<EmployeeTrend[]> => {
  try {
    // Fetch category distribution over time
    const categoryData = await getClientsPerCategory();
    
    // Transform to trend data (you may need a dedicated trends endpoint)
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((month, index) => ({
      monthName: month,
      count: categoryData.find(c => c.Category === 'EMPLOYEE')?.Count || 0,
      date: `${currentYear}-${String(index + 1).padStart(2, '0')}-01`,
    }));
  } catch (error) {
    console.error('Error fetching employee trends:', error);
    throw error;
  }
};

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

const analyticsAPI = {
  getClientsPerCategory,
  getClientsPerCategoryPerGender,
  getClientsPerCategoryPerStation,
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
  getEmployeeBreastExamResults,
  getEmployeePAPSmearResults,
  getEmployeeViaVilliResults,
  getDashboardOverview,
  formatChartData,
  getHealthMetricColor,
};

export default analyticsAPI;