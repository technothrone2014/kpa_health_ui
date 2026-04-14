import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  AlertCircle, CheckCircle, Save, RefreshCw, Anchor, Ship, Waves, 
  Clock, Calendar, User, MapPin, Settings, Shield, Loader2 
} from "lucide-react";
import { runCorrection } from "../api/dataCorrection";
import api from "../api/client";
import toast from "react-hot-toast";

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
};

interface CorrectionForm {
  year: number;
  month: number;
  day: number;
  dayOperator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  userId: number | null;
  stationId: number | null;
  beforeHour?: number;
  beforeMinute?: number;
}

interface User {
  Id: number;
  FirstName: string;
  LastName: string;
  FullName: string;
  Email?: string;
}

interface Station {
  Id: number;
  Title: string;
}

// Custom select style
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 36px 12px 12px',
  borderRadius: '12px',
  border: '1px solid rgba(74, 163, 194, 0.3)',
  background: 'white',
  color: '#1F2937',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.3s',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231F2937' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '16px',
} as React.CSSProperties;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '1px solid rgba(74, 163, 194, 0.3)',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s',
} as React.CSSProperties;

export default function DataCorrection() {
  const [form, setForm] = useState<CorrectionForm>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    dayOperator: 'gte',
    userId: null,
    stationId: null,
    beforeHour: undefined,
    beforeMinute: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Fetch users (field agents)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data.data || response.data || [];
    },
  });

  // Fetch stations
  const { data: stations, isLoading: stationsLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/stations');
      return response.data.data || response.data || [];
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : (name === 'userId' || name === 'stationId' ? parseInt(value) : value),
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.userId) {
      toast.error("Please select a User (Field Agent)");
      return;
    }
    if (!form.stationId) {
      toast.error("Please select a Station");
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const data = await runCorrection(form);
      setResult({ 
        success: true, 
        message: data.message,
        summary: data.summary 
      });
      toast.success("Correction completed successfully!");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      setResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      dayOperator: 'gte',
      userId: null,
      stationId: null,
      beforeHour: undefined,
      beforeMinute: undefined,
    });
    setResult(null);
  };

  // Helper to format user display name
  const formatUserName = (user: User) => {
    return `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Email || `User #${user.Id}`;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Section */}
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
            <Settings size={28} style={{ color: oceanColors.navy }} />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: oceanColors.white, margin: 0 }}>
              Station Correction Tool
            </h1>
            <p style={{ color: oceanColors.foam, margin: '4px 0 0 0', fontSize: '14px' }}>
              Correct station assignments for tallies and clients based on field agent and date/time
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} style={{
        background: oceanColors.white,
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        border: `1px solid ${oceanColors.wave}20`
      }}>
        
        {/* Field Agent & Station Section */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} style={{ color: oceanColors.gold }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>
              Field Agent & Target Station
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                <User size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Field Agent (User)
              </label>
              {usersLoading ? (
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                  Loading users...
                </div>
              ) : (
                <select
                  name="userId"
                  value={form.userId || ""}
                  onChange={handleChange}
                  style={selectStyle}
                  required
                >
                  <option value="">Select Field Agent...</option>
                  {users?.map((user: User) => (
                    <option key={user.Id} value={user.Id}>
                      {formatUserName(user)}
                    </option>
                  ))}
                </select>
              )}
              <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '4px' }}>
                Agent who captured the records
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Correct Station
              </label>
              {stationsLoading ? (
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                  Loading stations...
                </div>
              ) : (
                <select
                  name="stationId"
                  value={form.stationId || ""}
                  onChange={handleChange}
                  style={selectStyle}
                  required
                >
                  <option value="">Select Station...</option>
                  {stations?.map((station: Station) => (
                    <option key={station.Id} value={station.Id}>
                      {station.Title}
                    </option>
                  ))}
                </select>
              )}
              <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '4px' }}>
                Station where screening actually occurred
              </p>
            </div>
          </div>
        </div>

        {/* Date Section */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={20} style={{ color: oceanColors.gold }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>Date Selection</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                Year
              </label>
              <input
                type="number"
                name="year"
                min="2021"
                max={new Date().getFullYear()}
                value={form.year}
                onChange={handleNumberChange}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                Month
              </label>
              <select
                name="month"
                value={form.month}
                onChange={handleChange}
                style={{ ...selectStyle, padding: '12px 36px 12px 12px' }}
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                Day Condition
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  name="dayOperator"
                  value={form.dayOperator}
                  onChange={handleChange}
                  style={{ ...selectStyle, width: '100px', padding: '12px 32px 12px 12px' }}
                >
                  <option value="eq">=</option>
                  <option value="gt">&gt;</option>
                  <option value="gte">≥</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">≤</option>
                </select>
                <input
                  type="number"
                  name="day"
                  min="1"
                  max="31"
                  value={form.day}
                  onChange={handleNumberChange}
                  style={{ ...inputStyle, flex: 1 }}
                  required
                />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '8px' }}>
            Example: Day ≥ 22 means records from the 22nd onward for the selected month/year
          </p>
        </div>

        {/* Time Filter Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} style={{ color: oceanColors.gold }} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>Time Filter</h3>
              <p style={{ fontSize: '13px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                Optional - Filter records updated BEFORE a specific time
              </p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                Before Hour (0-23)
              </label>
              <input
                type="number"
                name="beforeHour"
                min="0"
                max="23"
                placeholder="Optional"
                value={form.beforeHour || ""}
                onChange={handleNumberChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = oceanColors.gold;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${oceanColors.gold}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = `${oceanColors.surface}30`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '6px' }}>
                Before Minute (0-59)
              </label>
              <input
                type="number"
                name="beforeMinute"
                min="0"
                max="59"
                placeholder="Optional"
                value={form.beforeMinute || ""}
                onChange={handleNumberChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = oceanColors.gold;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${oceanColors.gold}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = `${oceanColors.surface}30`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 24px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '12px',
              color: oceanColors.navy,
              fontWeight: '600',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>
                <Save size={20} />
                Run Station Correction
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '14px 24px',
              background: oceanColors.white,
              border: `1px solid ${oceanColors.wave}30`,
              borderRadius: '12px',
              color: oceanColors.textDark,
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = oceanColors.light;
              e.currentTarget.style.borderColor = oceanColors.surface;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = oceanColors.white;
              e.currentTarget.style.borderColor = `${oceanColors.wave}30`;
            }}
          >
            Reset Form
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: result.success ? `${oceanColors.success}10` : `${oceanColors.danger}10`,
            border: `1px solid ${result.success ? oceanColors.success : oceanColors.danger}30`
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {result.success ? (
                <CheckCircle size={24} style={{ color: oceanColors.success, flexShrink: 0 }} />
              ) : (
                <AlertCircle size={24} style={{ color: oceanColors.danger, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontWeight: '600', 
                  fontSize: '16px',
                  marginBottom: '8px',
                  color: result.success ? oceanColors.success : oceanColors.danger
                }}>
                  {result.success ? "Correction Complete" : "Error"}
                </p>
                <p style={{ fontSize: '14px', color: oceanColors.textDark, marginBottom: '12px' }}>
                  {result.message}
                </p>
                {result.summary && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: oceanColors.white,
                    borderRadius: '8px',
                    border: `1px solid ${oceanColors.light}20`,
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '8px' }}>
                      Summary:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: oceanColors.textLight }}>
                      <li>Tallies updated: {result.summary.talliesUpdated || 0}</li>
                      <li>Clients updated: {result.summary.clientsUpdated || 0}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Footer Note */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        background: oceanColors.white,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        border: `1px solid ${oceanColors.light}20`,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <Shield size={18} style={{ color: oceanColors.surface }} />
        <span style={{ color: oceanColors.textLight, fontSize: '13px' }}>
          This operation updates both Tallies and Clients tables. Please verify parameters before running.
        </span>
        <Waves size={18} style={{ color: oceanColors.surface }} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
