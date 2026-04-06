import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, ChevronDown, Download, Users, Anchor, Ship, Waves, Filter } from "lucide-react";
import { getEmployees } from "../api/employees";
import LoadingSpinner from "../components/LoadingSpinner";
import EmployeeTable from "../components/EmployeeTable";

// Oceanic Theme Colors
const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  light: '#2B7BA8',
  surface: '#4AA3C2',
  wave: '#6EC8D9',
  foam: '#A8E6CF',
  gold: '#FFD700',
  navy: '#0A1C40',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textDark: '#1F2937',
  textLight: '#6B7280',
  primary: '#1A4D8C',
  secondary: '#4AA3C2',
};

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
        (statusFilter === "active" && emp.Status === true) ||
        (statusFilter === "inactive" && emp.Status === false);
      
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div style={{ 
      background: 'rgba(239,68,68,0.1)', 
      border: `1px solid ${oceanColors.danger}`,
      borderRadius: '12px',
      padding: '16px',
      color: oceanColors.danger,
      textAlign: 'center'
    }}>
      Error loading employees. Please try again.
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Section with Oceanic Theme */}
      <div style={{ 
        background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
        borderRadius: '20px',
        padding: '24px 32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${oceanColors.surface}20 10px, ${oceanColors.surface}30 20px)`,
          pointerEvents: 'none'
        }} />
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
            }}>
              <Users size={28} style={{ color: oceanColors.navy }} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: oceanColors.white, margin: 0 }}>
                Crew Members
              </h1>
              <p style={{ color: oceanColors.foam, margin: '4px 0 0 0', fontSize: '14px' }}>
                Manage and view all registered port authority employees
              </p>
            </div>
          </div>
          
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '12px',
              color: oceanColors.navy,
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
            }}
          >
            <Plus size={20} />
            Add Crew Member
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        border: `1px solid ${oceanColors.secondary}20`,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: oceanColors.textLight
            }} />
            <input
              type="text"
              placeholder="Search by name, ID number, or station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                backgroundColor: oceanColors.white,
                border: `1px solid ${oceanColors.secondary}30`,
                borderRadius: '12px',
                color: oceanColors.textDark,
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = oceanColors.gold;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${oceanColors.gold}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = `${oceanColors.secondary}30`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: oceanColors.white,
                border: `1px solid ${oceanColors.secondary}30`,
                borderRadius: '12px',
                color: oceanColors.textDark,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = oceanColors.light;
                e.currentTarget.style.borderColor = oceanColors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = oceanColors.white;
                e.currentTarget.style.borderColor = `${oceanColors.secondary}30`;
              }}
            >
              <Filter size={18} />
              Filters
              <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
            
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: oceanColors.white,
                border: `1px solid ${oceanColors.secondary}30`,
                borderRadius: '12px',
                color: oceanColors.textDark,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = oceanColors.light;
                e.currentTarget.style.borderColor = oceanColors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = oceanColors.white;
                e.currentTarget.style.borderColor = `${oceanColors.secondary}30`;
              }}
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${oceanColors.secondary}20`,
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: oceanColors.textDark, cursor: 'pointer' }}>
              <input
                type="radio"
                value="all"
                checked={statusFilter === "all"}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ accentColor: oceanColors.primary }}
              />
              <span>All</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: oceanColors.textDark, cursor: 'pointer' }}>
              <input
                type="radio"
                value="active"
                checked={statusFilter === "active"}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ accentColor: oceanColors.success }}
              />
              <span>Active</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: oceanColors.textDark, cursor: 'pointer' }}>
              <input
                type="radio"
                value="inactive"
                checked={statusFilter === "inactive"}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ accentColor: oceanColors.danger }}
              />
              <span>Inactive</span>
            </label>
          </div>
        )}
      </div>

      {/* Employee Table */}
      <div style={{
        backgroundColor: oceanColors.white,
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${oceanColors.secondary}20`,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <EmployeeTable employees={filteredEmployees} />
      </div>
      
      {/* Footer Stats */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        background: oceanColors.white,
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        border: `1px solid ${oceanColors.secondary}20`,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Ship size={16} style={{ color: oceanColors.primary }} />
          <span style={{ color: oceanColors.textDark, fontSize: '14px' }}>
            Total Crew: {filteredEmployees.length} members
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Anchor size={16} style={{ color: oceanColors.gold }} />
          <span style={{ color: oceanColors.textLight, fontSize: '14px' }}>
            Kenya Ports Authority - EAP Health Week
          </span>
          <Waves size={16} style={{ color: oceanColors.primary }} />
        </div>
      </div>
    </div>
  );
}