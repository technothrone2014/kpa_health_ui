// kpa_health_ui/src/types/Employee.ts
export interface Employee {
  Id: number;
  UserId: number;
  IDNumber: string;
  FullName: string;
  FirstName: string;
  LastName: string;
  GenderId: number;
  GenderTitle: string;
  PhoneNumber: string;
  CategoryId: number;
  CategoryTitle: string;
  StationId: number;
  StationTitle: string;
  PostedOn: string;
  UpdatedOn: string;
  Pinned: boolean;
  Status: boolean;  // PostgreSQL returns boolean
  Deleted: boolean;
}