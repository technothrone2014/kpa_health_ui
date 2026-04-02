import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, ChevronDown, Download } from "lucide-react";
import { getEmployees } from "../api/employees";
import LoadingSpinner from "../components/LoadingSpinner";
import EmployeeTable from "../components/EmployeeTable";

export default function Employees() {
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    return employees.filter((emp) => {
      const matchesSearch = searchTerm === "" || 
        emp.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.IDNumber?.includes(searchTerm) ||
        emp.StationTitle?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && emp.Status === 1) ||
        (statusFilter === "inactive" && emp.Status === 0);
      
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading employees</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage and view all registered employees</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          <Plus className="h-5 w-5 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID number, or station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <ChevronDown className="h-5 w-5 mr-2" />
              Filters
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={statusFilter === "all"}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="form-radio text-red-600"
                />
                <span className="ml-2">All</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="active"
                  checked={statusFilter === "active"}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="form-radio text-red-600"
                />
                <span className="ml-2">Active</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="inactive"
                  checked={statusFilter === "inactive"}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="form-radio text-red-600"
                />
                <span className="ml-2">Inactive</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Employee Table */}
      <EmployeeTable employees={filteredEmployees} />
    </div>
  );
}
