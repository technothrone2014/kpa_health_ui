// kpa_health_ui/src/api/employees.ts
import api from "./client";
import { Employee } from "../types/Employee";

// Remove the extra /api/v1 since base URL already includes it
export const getEmployees = async (): Promise<Employee[]> => {
  const response = await api.get<Employee[]>("/employees");
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