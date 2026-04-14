import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  AlertCircle, CheckCircle, Save, RefreshCw, Anchor, Ship, Waves, 
  Clock, Calendar, User, MapPin, Settings, Shield, Loader2, Compass,
  TrendingUp, Activity
} from "lucide-react";
import { runCorrection } from "../api/dataCorrection";
import api from "../api/client";
import toast from "react-hot-toast";

// Oceanic Theme Colors - Aligned with Dashboard
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
  info: '#3B82F6',
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
  UserName?: string;
}

interface Station {
  Id: number;
  Title: string;
}

// Oceanic Select Style
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 36px 12px 12px',
  borderRadius: '12px',
  border: `1px solid ${oceanColors.surface}40`,
  background: oceanColors.white,
  color: oceanColors.textDark,
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.3s ease',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231A4D8C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '16px',
  boxShadow: '0 2px 4px rgba(10, 28, 64, 0.05)',
} as React.CSSProperties;

// Oceanic Input Style
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  border: `1px solid ${oceanColors.surface}40`,
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s ease',
  background: oceanColors.white,
  color: oceanColors.textDark,
  boxShadow: '0 2px 4px rgba(10, 28, 64, 0.05)',
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

  // Fetch field agents
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['field-agents'],
    queryFn: async () => {
      try {
        const response = await api.get('/users/field-agents');
        return response.data.data || response.data || [];
      } catch (error) {
        console.warn('Field agents endpoint not found, falling back to all users');
        const response = await api.get('/users');
        return response.data.data || response.data || [];
      }
    },
    retry: 1,
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
    
    if (!form.userId) {
      toast.error("Please select a Field Agent");
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

  const formatUserName = (user: User) => {
    if (user.FullName && user.FullName.trim() !== '') {
      return user.FullName;
    }
    const firstName = user.FirstName || '';
    const lastName = user.LastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    if (user.UserName) return user.UserName;
    if (user.Email) return user.Email;
    return `User #${user.Id}`;
  };

  // Focus styles for inputs
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = oceanColors.gold;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${oceanColors.gold}20`;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = `${oceanColors.surface}40`;
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(10, 28, 64, 0.05)';
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid}, ${oceanColors.light})`,
      padding: '24px',
      fontFamily: 'Verdana, Geneva, sans-serif'
    }}>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Hero Header - Oceanic Style matching Dashboard */}
        <div style={{ 
          position: 'relative',
          marginBottom: '32px',
          overflow: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: `linear-gradient(90deg, ${oceanColors.navy}, ${oceanColors.deep}, ${oceanColors.mid})` 
          }} />
          
          {/* Wave pattern overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: `repeating-linear-gradient(0deg, transparent, transparent 8px, ${oceanColors.surface}15 8px, ${oceanColors.surface}25 16px)`,
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                animation: 'float 3s ease-in-out infinite'
              }}>
                <Anchor size={32} style={{ color: oceanColors.navy }} />
              </div>
              <div>
                <p style={{ 
                  color: oceanColors.foam, 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <Compass size={14} />
                  Data Management • Station Correction
                </p>
                <h1 style={{ 
                  fontSize: 'clamp(28px, 4vw, 36px)', 
                  fontWeight: 'bold', 
                  color: oceanColors.white, 
                  margin: 0 
                }}>
                  Station Correction Tool
                  <span style={{ color: oceanColors.gold, marginLeft: '12px' }}>⚓</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '12px 0 0 0', fontSize: '15px', maxWidth: '600px', lineHeight: 1.6 }}>
                  Correct station assignments for tallies and clients based on field agent and date/time parameters.
                  Navigate with precision, Captain.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Card - Glass morphism style */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(8px)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: `1px solid ${oceanColors.wave}30`,
          marginBottom: '24px'
        }}>
          
          {/* Quick Stats Banner */}
          <div style={{
            display: 'flex',
            gap: '16px',
            padding: '16px 20px',
            background: `linear-gradient(135deg, ${oceanColors.navy}08, ${oceanColors.deep}08)`,
            borderRadius: '16px',
            marginBottom: '32px',
            border: `1px solid ${oceanColors.surface}20`,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.success}, ${oceanColors.wave})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={20} style={{ color: oceanColors.white }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>Total Field Agents</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                  {usersLoading ? '...' : users?.length || 0}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.warning}, ${oceanColors.gold})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={20} style={{ color: oceanColors.navy }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>Available Stations</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                  {stationsLoading ? '...' : stations?.length || 0}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${oceanColors.info}, ${oceanColors.surface})`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: oceanColors.white }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: 0 }}>Target Date</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: oceanColors.textDark, margin: 0 }}>
                  {form.year}-{String(form.month).padStart(2, '0')}-{String(form.day).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>

          {/* Field Agent & Station Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                <User size={22} style={{ color: oceanColors.gold }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                  Field Agent & Target Station
                </h3>
                <p style={{ fontSize: '13px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                  Select the field agent and the correct station where screening occurred
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '8px' }}>
                  <User size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: oceanColors.mid }} />
                  Field Agent
                </label>
                {usersLoading ? (
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: '8px', color: oceanColors.mid }} />
                    <span style={{ color: oceanColors.textLight }}>Loading field agents...</span>
                  </div>
                ) : usersError ? (
                  <div style={{ ...inputStyle, color: oceanColors.danger, borderColor: oceanColors.danger, background: `${oceanColors.danger}05` }}>
                    ⚠️ Error loading users. Please refresh.
                  </div>
                ) : (
                  <select
                    name="userId"
                    value={form.userId || ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
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
                <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '6px' }}>
                  <Compass size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Agent who captured the records
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '8px' }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: oceanColors.mid }} />
                  Correct Station
                </label>
                {stationsLoading ? (
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: '8px', color: oceanColors.mid }} />
                    <span style={{ color: oceanColors.textLight }}>Loading stations...</span>
                  </div>
                ) : (
                  <select
                    name="stationId"
                    value={form.stationId || ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
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
                <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '6px' }}>
                  <Anchor size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Station where screening actually occurred
                </p>
              </div>
            </div>
          </div>

          {/* Date Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                <Calendar size={22} style={{ color: oceanColors.gold }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>Date Selection</h3>
                <p style={{ fontSize: '13px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                  Filter records by the date they were updated
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1.5fr', 
              gap: '16px', 
              alignItems: 'end',
              background: `linear-gradient(135deg, ${oceanColors.navy}05, ${oceanColors.deep}05)`,
              padding: '20px',
              borderRadius: '16px',
              border: `1px solid ${oceanColors.surface}20`
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '6px' }}>
                  Year
                </label>
                <input
                  type="number"
                  name="year"
                  min="2021"
                  max={new Date().getFullYear()}
                  value={form.year}
                  onChange={handleNumberChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '6px' }}>
                  Month
                </label>
                <select
                  name="month"
                  value={form.month}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={selectStyle}
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '6px' }}>
                  Day Condition
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    name="dayOperator"
                    value={form.dayOperator}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ ...selectStyle, width: '130px' }}
                  >
                    <option value="eq">= (equals)</option>
                    <option value="gt">&gt; (after)</option>
                    <option value="gte">≥ (on or after)</option>
                    <option value="lt">&lt; (before)</option>
                    <option value="lte">≤ (on or before)</option>
                  </select>
                  <input
                    type="number"
                    name="day"
                    min="1"
                    max="31"
                    value={form.day}
                    onChange={handleNumberChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ ...inputStyle, flex: 1 }}
                    required
                  />
                </div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '10px', fontStyle: 'italic' }}>
              <Waves size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Example: Day ≥ 22 means records from the 22nd onward for the selected month/year
            </p>
          </div>

          {/* Time Filter Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                <Clock size={22} style={{ color: oceanColors.gold }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>Time Filter</h3>
                <p style={{ fontSize: '13px', color: oceanColors.textLight, margin: '4px 0 0 0' }}>
                  Optional - Filter records updated BEFORE a specific time
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '20px',
              background: `linear-gradient(135deg, ${oceanColors.navy}05, ${oceanColors.deep}05)`,
              padding: '20px',
              borderRadius: '16px',
              border: `1px solid ${oceanColors.surface}20`
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '8px' }}>
                  Before Hour (0-23)
                </label>
                <input
                  type="number"
                  name="beforeHour"
                  min="0"
                  max="23"
                  placeholder="Optional"
                  value={form.beforeHour ?? ""}
                  onChange={handleNumberChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: oceanColors.textDark, marginBottom: '8px' }}>
                  Before Minute (0-59)
                </label>
                <input
                  type="number"
                  name="beforeMinute"
                  min="0"
                  max="59"
                  placeholder="Optional"
                  value={form.beforeMinute ?? ""}
                  onChange={handleNumberChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
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
                gap: '10px',
                padding: '16px 28px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                border: 'none',
                borderRadius: '14px',
                color: oceanColors.navy,
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 15px 20px -5px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing Correction...
                </>
              ) : (
                <>
                  <Save size={22} />
                  Run Station Correction
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '16px 28px',
                background: oceanColors.white,
                border: `1px solid ${oceanColors.surface}40`,
                borderRadius: '14px',
                color: oceanColors.textDark,
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${oceanColors.light}10`;
                e.currentTarget.style.borderColor = oceanColors.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = oceanColors.white;
                e.currentTarget.style.borderColor = `${oceanColors.surface}40`;
              }}
            >
              Reset Form
            </button>
          </div>

          {/* Result Display */}
          {result && (
            <div style={{
              padding: '24px',
              borderRadius: '16px',
              background: result.success 
                ? `linear-gradient(135deg, ${oceanColors.success}10, ${oceanColors.success}05)`
                : `linear-gradient(135deg, ${oceanColors.danger}10, ${oceanColors.danger}05)`,
              border: `2px solid ${result.success ? oceanColors.success : oceanColors.danger}30`,
              animation: 'slideIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {result.success ? (
                  <CheckCircle size={28} style={{ color: oceanColors.success, flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={28} style={{ color: oceanColors.danger, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    fontWeight: 'bold', 
                    fontSize: '18px',
                    marginBottom: '12px',
                    color: result.success ? oceanColors.success : oceanColors.danger
                  }}>
                    {result.success ? "✅ Correction Complete" : "❌ Correction Failed"}
                  </p>
                  <p style={{ fontSize: '15px', color: oceanColors.textDark, marginBottom: '16px', lineHeight: 1.6 }}>
                    {result.message}
                  </p>
                  {result.summary && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: oceanColors.white,
                      borderRadius: '12px',
                      border: `1px solid ${oceanColors.light}30`,
                    }}>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.textDark, marginBottom: '12px' }}>
                        <Activity size={16} style={{ display: 'inline', marginRight: '6px' }} />
                        Summary Report:
                      </p>
                      <div style={{ display: 'flex', gap: '32px' }}>
                        <div>
                          <p style={{ fontSize: '13px', color: oceanColors.textLight, marginBottom: '4px' }}>Tallies Updated</p>
                          <p style={{ fontSize: '24px', fontWeight: 'bold', color: oceanColors.deep }}>
                            {result.summary.talliesUpdated || 0}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', color: oceanColors.textLight, marginBottom: '4px' }}>Clients Updated</p>
                          <p style={{ fontSize: '24px', fontWeight: 'bold', color: oceanColors.mid }}>
                            {result.summary.clientsUpdated || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          border: `1px solid ${oceanColors.wave}30`,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <Shield size={18} style={{ color: oceanColors.surface }} />
          <span style={{ color: oceanColors.textLight, fontSize: '13px' }}>
            This operation updates both Tallies and Clients tables. Please verify parameters before running.
          </span>
          <Ship size={18} style={{ color: oceanColors.surface }} />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
