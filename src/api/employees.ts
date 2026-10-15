// kpa_health_ui/src/api/employees.ts
import api from "./client";
import { Employee } from "../types/Employee";

export interface EmployeeListQuery {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  startDate?: string;
  endDate?: string;
  stations?: string[];
  categories?: string[];
  gender?: 'all' | 'male' | 'female';
  page?: number;
  pageSize?: number;
  sortBy?: keyof Employee;
  sortDirection?: 'asc' | 'desc';
  all?: boolean;
}

export interface EmployeePage {
  data: Employee[];
  total: number;
  page: number;
  pageSize: number;
}

export const getEmployees = async (query: EmployeeListQuery = {}): Promise<EmployeePage> => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach(item => params.append(key, item));
    else if (value !== undefined && value !== '') params.set(key, String(value));
  });

  const response = await api.get<EmployeePage>(`/employees?${params.toString()}`);
  return response.data;
};

export const getEmployeeById = async (id: number): Promise<Employee> => {
  const response = await api.get<Employee>(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.post<Employee>("/employees", employee);
  return response.data;
};

export const updateEmployee = async (id: number, employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.put<Employee>(`/employees/${id}`, employee);
  return response.data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await api.delete(`/employees/${id}`);
};