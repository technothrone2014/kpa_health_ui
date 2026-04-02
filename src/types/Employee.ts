// kpa_health_ui/src/types/Employee.ts

export interface Employee {
  Id: number;
  FullName: string;
  IDNumber: string;
  CategoryTitle: string;
  StationTitle: string;
  Status: number; // 1 for Active, 0 for Inactive
  // Add other properties as needed
}