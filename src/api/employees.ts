// kpa_health_ui/src/api/employees.ts
import api from "./client";
import { Employee } from "../types/Employee";

// Tell TypeScript exactly what we return.
export const getEmployees = async (): Promise<Employee[]> => {
  const response = await api.get<Employee[]>("/employees");
  return response.data;
};
