import React, { useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import { Employee } from "../types/Employee";
import PatientProfile from "./PatientProfile";

interface EmployeeTableProps {
  employees: Employee[];
}

const oceanColors = {
  primary: '#0B2F9E',
  secondary: '#1A4D8C',
  accent: '#00A3E0',
  gold: '#FFD700',
  dark: '#0A1C40',
  light: '#E8F0FE',
  success: '#10B981',
  danger: '#EF4444',
  white: '#FFFFFF',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Employee>("FullName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedPatient, setSelectedPatient] = useState<Employee | null>(null);

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = sortedEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  return (
    <div>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: oceanColors.dark }}>
              <th style={{ padding: '16px', textAlign: 'left', color: oceanColors.gold, fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort("Id")}>ID</th>
              <th style={{ padding: '16px', textAlign: 'left', color: oceanColors.gold, fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort("FullName")}>Full Name</th>
              <th style={{ padding: '16px', textAlign: 'left', color: oceanColors.gold, fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort("IDNumber")}>ID Number</th>
              <th style={{ padding: '16px', textAlign: 'left', color: oceanColors.gold, fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort("CategoryTitle")}>Category</th>
              <th style={{ padding: '16px', textAlign: 'left', color: oceanColors.gold, fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort("StationTitle")}>Station</th>
              <th style={{ padding: '16px', textAlign: 'left', color: oceanColors.gold, fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'right', color: oceanColors.gold, fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.map((employee, index) => (
              <tr 
                key={employee.Id} 
                style={{ 
                  borderBottom: `1px solid ${oceanColors.secondary}30`,
                  backgroundColor: index % 2 === 0 ? oceanColors.white : '#F9FAFB',
                  transition: 'background 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = oceanColors.light}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? oceanColors.white : '#F9FAFB'}
                onClick={() => setSelectedPatient(employee)}
              >
                <td style={{ padding: '16px', color: oceanColors.textDark, fontSize: '14px' }}>{employee.Id}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '500', color: oceanColors.textDark, fontSize: '14px' }}>{employee.FullName}</div>
                </td>
                <td style={{ padding: '16px', color: oceanColors.textLight, fontSize: '14px' }}>{employee.IDNumber}</td>
                <td style={{ padding: '16px', color: oceanColors.textLight, fontSize: '14px' }}>{employee.CategoryTitle}</td>
                <td style={{ padding: '16px', color: oceanColors.textLight, fontSize: '14px' }}>{employee.StationTitle}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: employee.Status === true ? `${oceanColors.success}15` : `${oceanColors.danger}15`,
                    color: employee.Status === true ? oceanColors.success : oceanColors.danger,
                    border: `1px solid ${employee.Status === true ? oceanColors.success : oceanColors.danger}30`
                  }}>
                    {employee.Status === true ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatient(employee);
                      }}
                      style={{ 
                        color: oceanColors.textLight, 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.3s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = oceanColors.light;
                        e.currentTarget.style.color = oceanColors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = oceanColors.textLight;
                      }}
                    >
                      <Eye size={16} />
                      <span style={{ fontSize: '12px' }}>View</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        padding: '16px 20px',
        borderTop: `1px solid ${oceanColors.secondary}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: oceanColors.white,
        borderRadius: '0 0 12px 12px'
      }}>
        <div style={{ color: oceanColors.textLight, fontSize: '14px' }}>
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedEmployees.length)} of {sortedEmployees.length} results
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              backgroundColor: oceanColors.white,
              border: `1px solid ${oceanColors.secondary}30`,
              borderRadius: '8px',
              color: currentPage === 1 ? oceanColors.textLight : oceanColors.primary,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1,
              transition: 'all 0.3s'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ padding: '8px 12px', color: oceanColors.textDark, fontSize: '14px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              backgroundColor: oceanColors.white,
              border: `1px solid ${oceanColors.secondary}30`,
              borderRadius: '8px',
              color: currentPage === totalPages ? oceanColors.textLight : oceanColors.primary,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1,
              transition: 'all 0.3s'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Patient Profile Modal */}
      {selectedPatient && (
        <PatientProfile 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
        />
      )}
    </div>
  );
}
