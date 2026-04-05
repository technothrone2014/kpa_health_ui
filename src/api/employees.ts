// kpa_health_ui/src/api/employees.ts
import api from "./client";
import { Employee } from "../types/Employee";

// Tell TypeScript exactly what we return.
export const getEmployees = async (): Promise<Employee[]> => {
  // Add the /v1/ prefix to match your backend route
  const response = await api.get<Employee[]>("/v1/employees");
  return response.data;
};

// Optional: Add other employee API functions
export const getEmployeeById = async (id: number): Promise<Employee> => {
  const response = await api.get<Employee>(`/v1/employees/${id}`);
  return response.data;
};

export const createEmployee = async (employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.post<Employee>("/v1/employees", employee);
  return response.data;
};

export const updateEmployee = async (id: number, employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.put<Employee>(`/v1/employees/${id}`, employee);
  return response.data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await api.delete(`/v1/employees/${id}`);
};