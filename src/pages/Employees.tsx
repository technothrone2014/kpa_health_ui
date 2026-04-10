import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, Plus, ChevronDown, Download, Users, Anchor, Ship, Waves, Filter, 
  Calendar, MapPin, Briefcase, FileSpreadsheet, FileJson, FileText,
  X, RefreshCw, AlertTriangle, CheckCircle
} from "lucide-react";
import { getEmployees } from "../api/employees";
import LoadingSpinner from "../components/LoadingSpinner";
import EmployeeTable from "../components/EmployeeTable";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

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

// Available stations (you can fetch this from API)
const stations = [
  'BANDARI CLINIC', 'SHIFT MANAGER', 'KAPENGURIA', 'MCC', 'BAGGAGE HALL',
  'TERMINAL ENGINEERING', 'TOYO', 'DOCKYARD', 'BANDARI MARITIME COLLEGE',
  'FERRY SERVICES', 'HEAD QUARTERS', 'CT2', 'AGF SECTION', 'MPDP',
  'K-SECTION', 'MOBILE PLANT', 'SGR', 'MACHINE FOREMAN', 'MARINE OPERATIONS',
  'NEW KIPEVU CLINIC'
];

// Categories
const categories = ['EMPLOYEE', 'DEPENDENT', 'PORT USER'];

// Export formats
type ExportFormat = 'csv' | 'json' | 'xlsx';

export default function Employees() {
  const { data: employees, isLoading, error, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Filtered employees with advanced filters
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    return employees.filter((emp) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        emp.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.IDNumber?.includes(searchTerm) ||
        emp.StationTitle?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && emp.Status === true) ||
        (statusFilter === "inactive" && emp.Status === false);
      
      // Date range filter (based on PostedOn)
      let matchesDateRange = true;
      if (dateRange.start) {
        const postedDate = new Date(emp.PostedOn);
        const startDate = new Date(dateRange.start);
        if (postedDate < startDate) matchesDateRange = false;
      }
      if (dateRange.end && matchesDateRange) {
        const postedDate = new Date(emp.PostedOn);
        const endDate = new Date(dateRange.end);
        if (postedDate > endDate) matchesDateRange = false;
      }
      
      // Station filter
      const matchesStation = selectedStations.length === 0 || 
        selectedStations.includes(emp.StationTitle);
      
      // Category filter
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.includes(emp.CategoryTitle);
      
      // Gender filter
      const matchesGender = genderFilter === "all" ||
        (genderFilter === "male" && emp.GenderTitle?.toLowerCase() === 'male') ||
        (genderFilter === "female" && emp.GenderTitle?.toLowerCase() === 'female');
      
      return matchesSearch && matchesStatus && matchesDateRange && 
             matchesStation && matchesCategory && matchesGender;
    });
  }, [employees, searchTerm, statusFilter, dateRange, selectedStations, selectedCategories, genderFilter]);

  // Export handlers
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = filteredEmployees.map(emp => ({
        'ID': emp.Id,
        'Full Name': emp.FullName,
        'ID Number': emp.IDNumber,
        'Category': emp.CategoryTitle,
        'Station': emp.StationTitle,
        'Gender': emp.GenderTitle,
        'Phone Number': emp.PhoneNumber,
        'Status': emp.Status ? 'Active' : 'Inactive',
        'Registered Date': format(new Date(emp.PostedOn), 'PPP'),
        'Last Updated': format(new Date(emp.UpdatedOn), 'PPP')
      }));

      switch (exportFormat) {
        case 'csv':
          const csvHeaders = Object.keys(exportData[0] || {}).join(',');
          const csvRows = exportData.map(row => Object.values(row).join(','));
          const csv = [csvHeaders, ...csvRows].join('\n');
          downloadFile(csv, `employees_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`, 'text/csv');
          break;
          
        case 'json':
          const json = JSON.stringify(exportData, null, 2);
          downloadFile(json, `employees_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`, 'application/json');
          break;
          
        case 'xlsx':
          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Employees');
          XLSX.writeFile(wb, `employees_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateRange({ start: '', end: '' });
    setSelectedStations([]);
    setSelectedCategories([]);
    setGenderFilter("all");
  };

  const toggleStation = (station: string) => {
    setSelectedStations(prev =>
      prev.includes(station) ? prev.filter(s => s !== station) : [...prev, station]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

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

  const activeFiltersCount = [
    searchTerm ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
    dateRange.start || dateRange.end ? 1 : 0,
    selectedStations.length,
    selectedCategories.length,
    genderFilter !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

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
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => refetch()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 2, position: 'relative' }}>
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
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: showFilters ? oceanColors.primary : oceanColors.white,
                border: `1px solid ${oceanColors.secondary}30`,
                borderRadius: '12px',
                color: showFilters ? 'white' : oceanColors.textDark,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
            >
              <Filter size={18} />
              Filters
              <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              {activeFiltersCount > 0 && (
                <span style={{
                  background: oceanColors.gold,
                  color: oceanColors.navy,
                  borderRadius: '10px',
                  padding: '0 6px',
                  fontSize: '11px',
                  marginLeft: '4px'
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                style={{
                  padding: '12px',
                  border: `1px solid ${oceanColors.secondary}30`,
                  borderRadius: '12px',
                  background: oceanColors.white,
                  cursor: 'pointer'
                }}
              >
                <option value="csv">📄 CSV</option>
                <option value="json">📋 JSON</option>
                <option value="xlsx">📊 Excel (XLSX)</option>
              </select>
              
              <button
                onClick={handleExport}
                disabled={isExporting || filteredEmployees.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: oceanColors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isExporting ? 0.6 : 1
                }}
              >
                {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                Export ({filteredEmployees.length})
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: `1px solid ${oceanColors.secondary}20`,
          }}>
            {/* Basic Filters Row */}
            <div style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              marginBottom: '20px'
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

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: oceanColors.primary,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: showAdvancedFilters ? '16px' : '0'
              }}
            >
              <ChevronDown size={14} style={{ transform: showAdvancedFilters ? 'rotate(180deg)' : 'none' }} />
              Advanced Filters
            </button>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginTop: '16px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px'
              }}>
                {/* Date Range */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '8px' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Registration Date Range
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
                      placeholder="Start Date"
                    />
                    <span style={{ alignSelf: 'center' }}>to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
                      placeholder="End Date"
                    />
                  </div>
                </div>

                {/* Gender Filter */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '8px' }}>
                    Gender
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        value="all"
                        checked={genderFilter === "all"}
                        onChange={(e) => setGenderFilter(e.target.value as any)}
                      />
                      All
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        value="male"
                        checked={genderFilter === "male"}
                        onChange={(e) => setGenderFilter(e.target.value as any)}
                      />
                      Male
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        value="female"
                        checked={genderFilter === "female"}
                        onChange={(e) => setGenderFilter(e.target.value as any)}
                      />
                      Female
                    </label>
                  </div>
                </div>

                {/* Stations Filter */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '8px' }}>
                    <MapPin size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Stations ({selectedStations.length} selected)
                  </label>
                  <div style={{ maxHeight: '120px', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {stations.slice(0, 10).map(station => (
                      <button
                        key={station}
                        onClick={() => toggleStation(station)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          background: selectedStations.includes(station) ? oceanColors.primary : '#e2e8f0',
                          color: selectedStations.includes(station) ? 'white' : oceanColors.textDark,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {station.split(' ').slice(0, 2).join(' ')}
                      </button>
                    ))}
                    {stations.length > 10 && (
                      <span style={{ fontSize: '11px', color: '#888', alignSelf: 'center' }}>
                        +{stations.length - 10} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Categories Filter */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '8px' }}>
                    <Briefcase size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Categories ({selectedCategories.length} selected)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          background: selectedCategories.includes(cat) ? oceanColors.primary : '#e2e8f0',
                          color: selectedCategories.includes(cat) ? 'white' : oceanColors.textDark,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button
                  onClick={clearFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: oceanColors.textDark
                  }}
                >
                  <X size={14} />
                  Clear all filters ({activeFiltersCount})
                </button>
              </div>
            )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ship size={16} style={{ color: oceanColors.primary }} />
            <span style={{ color: oceanColors.textDark, fontSize: '14px' }}>
              Total Crew: {filteredEmployees.length} members
            </span>
          </div>
          {selectedStations.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: oceanColors.textLight }}>
              <MapPin size={12} />
              <span>Filtered by {selectedStations.length} station(s)</span>
            </div>
          )}
          {selectedCategories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: oceanColors.textLight }}>
              <Briefcase size={12} />
              <span>Filtered by {selectedCategories.length} category(s)</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Anchor size={16} style={{ color: oceanColors.gold }} />
          <span style={{ color: oceanColors.textLight, fontSize: '14px' }}>
            Kenya Ports Authority - EAP Health Week
          </span>
          <Waves size={16} style={{ color: oceanColors.primary }} />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}