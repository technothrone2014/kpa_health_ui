// pages/FieldDataCapture.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  User, Phone, Calendar, MapPin, Users, Search, LogOut, Ship,
  ChevronDown, Plus, ClipboardList, Stethoscope, Anchor, Waves,
  AlertCircle, CheckCircle, RefreshCw, Save, X, UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import FieldFindings from '../components/FieldFindings';
import toast from 'react-hot-toast';

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

interface Client {
  Id: number;
  FullName: string;
  IDNumber: string;
  PhoneNumber: string;
  GenderId: number;
  GenderTitle?: string;
  CategoryId: number;
  CategoryTitle?: string;
  StationId: number;
  DateOfBirth: string;
  Age?: number;
}

interface Category {
  Id: number;
  Title: string;
}

interface Gender {
  Id: number;
  Title: string;
}

interface Station {
  Id: number;
  Title: string;
}

export default function FieldDataCapture() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Session station - user selects once per session
  const [sessionStation, setSessionStation] = useState<number | null>(null);
  const [showStationSelector, setShowStationSelector] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // New client form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    FullName: '',
    FirstName: '',
    LastName: '',
    IDNumber: '',
    PhoneNumber: '',
    GenderId: 0,
    CategoryId: 0,
    DateOfBirth: '',
  });
  
  // Show field findings after client is selected/created
  const [showFindings, setShowFindings] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/analytics/categories');
      return response.data.data || [];
    },
  });

  // Fetch genders
  const { data: genders } = useQuery({
    queryKey: ['genders'],
    queryFn: async () => {
      const response = await api.get('/lookups/genders');
      return response.data || [];
    },
  });

  // Fetch stations
  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/stations');
      return response.data.data || [];
    },
  });

  // Search clients mutation
  const searchClients = useMutation({
    mutationFn: async (term: string) => {
      const response = await api.get(`/clients/search?term=${encodeURIComponent(term)}`);
      return response.data.data || response.data || [];
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setShowSearchResults(true);
    },
    onError: (error: any) => {
      toast.error('Search failed. Please try again.');
    },
  });

  // Create new client mutation
  const createClient = useMutation({
    mutationFn: async (clientData: any) => {
      // Split FullName into FirstName and LastName
      const nameParts = clientData.FullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const payload = {
        ...clientData,
        FirstName: firstName,
        LastName: lastName,
        StationId: sessionStation,
        UserId: user?.Id,
        Status: true,
        Deleted: false,
        Pinned: false,
        PostedOn: new Date().toISOString(),
        UpdatedOn: new Date().toISOString(),
      };
      
      const response = await api.post('/clients', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Client registered successfully!');
      const clientId = data.Id || data.id;
      setCreatedClientId(clientId);
      setSelectedClient({
        Id: clientId,
        FullName: newClient.FullName,
        IDNumber: newClient.IDNumber,
        PhoneNumber: newClient.PhoneNumber,
        GenderId: newClient.GenderId,
        CategoryId: newClient.CategoryId,
        StationId: sessionStation!,
        DateOfBirth: newClient.DateOfBirth,
      });
      setShowNewClientForm(false);
      setShowFindings(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to register client');
    },
  });

  // Handle search
  const handleSearch = () => {
    if (searchTerm.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }
    setIsSearching(true);
    searchClients.mutate(searchTerm);
    setIsSearching(false);
  };

  // Handle client selection
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setShowSearchResults(false);
    setShowFindings(true);
  };

  // Handle new client form submission
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionStation) {
      toast.error('Please select a station first');
      return;
    }
    if (!newClient.GenderId || !newClient.CategoryId) {
      toast.error('Please select gender and category');
      return;
    }
    createClient.mutate(newClient);
  };

  // Handle findings success
  const handleFindingsSuccess = () => {
    toast.success('All data saved! Ready for next client.');
    // Reset for next client
    setSelectedClient(null);
    setCreatedClientId(null);
    setShowFindings(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Parse FullName from search
  const parseFullName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || ''
    };
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid}, ${oceanColors.light})`,
      padding: '24px',
      fontFamily: 'Verdana, Geneva, sans-serif'
    }}>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Hero Header */}
        <div style={{ 
          position: 'relative',
          marginBottom: '24px',
          overflow: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: `linear-gradient(90deg, ${oceanColors.navy}, ${oceanColors.deep}, ${oceanColors.mid})` 
          }} />
          
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: `repeating-linear-gradient(0deg, transparent, transparent 8px, ${oceanColors.surface}15 8px, ${oceanColors.surface}25 16px)`,
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', padding: '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <ClipboardList size={28} style={{ color: oceanColors.navy }} />
                </div>
                <div>
                  <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 'bold', color: oceanColors.white, margin: 0 }}>
                    Field Data Capture
                    <span style={{ color: oceanColors.gold, marginLeft: '12px' }}>📋</span>
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontSize: '14px' }}>
                    {user?.FirstName} {user?.LastName} • Field Agent
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '12px',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Station Selector - Show if not selected */}
        {showStationSelector && !sessionStation && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '24px',
            border: `1px solid ${oceanColors.wave}30`,
            textAlign: 'center',
            maxWidth: '500px',
            margin: '0 auto 24px'
          }}>
            <MapPin size={48} style={{ color: oceanColors.gold, marginBottom: '16px' }} />
            <h2 style={{ color: oceanColors.textDark, marginBottom: '8px' }}>Select Your Station</h2>
            <p style={{ color: oceanColors.textLight, marginBottom: '24px', fontSize: '14px' }}>
              Please select the station where you're conducting screenings today
            </p>
            <select
              value={sessionStation || ''}
              onChange={(e) => {
                const stationId = parseInt(e.target.value);
                setSessionStation(stationId);
                setShowStationSelector(false);
                toast.success(`Station set for this session`);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: `1px solid ${oceanColors.surface}40`,
                fontSize: '16px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Choose a station...</option>
              {stations?.map((station: Station) => (
                <option key={station.Id} value={station.Id}>{station.Title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Station Indicator */}
        {sessionStation && (
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            borderRadius: '12px',
            padding: '10px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
              <MapPin size={18} style={{ color: oceanColors.gold }} />
              <span>Current Station: <strong>{stations?.find((s: Station) => s.Id === sessionStation)?.Title}</strong></span>
            </div>
            <button
              onClick={() => {
                setSessionStation(null);
                setShowStationSelector(true);
                setSelectedClient(null);
                setShowFindings(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Change Station
            </button>
          </div>
        )}

        {/* Main Content - Only show if station is selected */}
        {sessionStation && !showFindings && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '32px',
            border: `1px solid ${oceanColors.wave}30`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            
            {/* Search Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={20} style={{ color: oceanColors.deep }} />
                Search for Existing Client
              </h3>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: oceanColors.textLight }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by Name, Phone Number, or CHK No..."
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      borderRadius: '12px',
                      border: `1px solid ${oceanColors.surface}40`,
                      fontSize: '15px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
                    onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.surface}40`}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searchClients.isPending}
                  style={{
                    padding: '16px 32px',
                    background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: searchClients.isPending ? 'not-allowed' : 'pointer',
                    opacity: searchClients.isPending ? 0.7 : 1
                  }}
                >
                  {searchClients.isPending ? <RefreshCw size={18} className="animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', color: oceanColors.textLight, marginBottom: '12px' }}>
                    Found {searchResults.length} matching client(s):
                  </p>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {searchResults.map((client) => (
                      <div
                        key={client.Id}
                        onClick={() => handleSelectClient(client)}
                        style={{
                          padding: '16px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          border: `1px solid ${oceanColors.surface}20`,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${oceanColors.gold}10`;
                          e.currentTarget.style.borderColor = oceanColors.gold;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = `${oceanColors.surface}20`;
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: 'bold', color: oceanColors.textDark, marginBottom: '4px' }}>
                              {client.FullName}
                            </p>
                            <p style={{ fontSize: '13px', color: oceanColors.textLight }}>
                              CHK: {client.IDNumber} • {client.PhoneNumber}
                            </p>
                          </div>
                          <ChevronDown size={20} style={{ color: oceanColors.deep }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSearchResults(false)}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: 'transparent',
                      border: `1px solid ${oceanColors.surface}40`,
                      borderRadius: '8px',
                      color: oceanColors.textLight,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Close Results
                  </button>
                </div>
              )}

              {showSearchResults && searchResults.length === 0 && (
                <div style={{ marginTop: '20px', textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ color: oceanColors.textLight }}>No clients found matching "{searchTerm}"</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '24px 0',
              gap: '16px'
            }}>
              <div style={{ flex: 1, height: '1px', background: `${oceanColors.surface}30` }} />
              <span style={{ color: oceanColors.textLight, fontSize: '14px', fontWeight: 'bold' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: `${oceanColors.surface}30` }} />
            </div>

            {/* New Client Registration */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: oceanColors.textDark, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} style={{ color: oceanColors.success }} />
                Register New Client
              </h3>

              {!showNewClientForm ? (
                <button
                  onClick={() => setShowNewClientForm(true)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: `${oceanColors.success}10`,
                    border: `2px dashed ${oceanColors.success}`,
                    borderRadius: '12px',
                    color: oceanColors.success,
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={20} />
                  Register New Client
                </button>
              ) : (
                <form onSubmit={handleCreateClient} style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '24px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={newClient.FullName}
                        onChange={(e) => setNewClient({ ...newClient, FullName: e.target.value })}
                        placeholder="e.g., John Doe"
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                        CHK No *
                      </label>
                      <input
                        type="text"
                        value={newClient.IDNumber}
                        onChange={(e) => setNewClient({ ...newClient, IDNumber: e.target.value })}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                        Mobile *
                      </label>
                      <input
                        type="tel"
                        value={newClient.PhoneNumber}
                        onChange={(e) => setNewClient({ ...newClient, PhoneNumber: e.target.value })}
                        placeholder="+254..."
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                        Category *
                      </label>
                      <select
                        value={newClient.CategoryId}
                        onChange={(e) => setNewClient({ ...newClient, CategoryId: parseInt(e.target.value) })}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px', background: 'white' }}
                      >
                        <option value="">Select Category</option>
                        {categories?.map((cat: Category) => (
                          <option key={cat.Id} value={cat.Id}>{cat.Title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                        Gender *
                      </label>
                      <select
                        value={newClient.GenderId}
                        onChange={(e) => setNewClient({ ...newClient, GenderId: parseInt(e.target.value) })}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px', background: 'white' }}
                      >
                        <option value="">Select Gender</option>
                        {genders?.map((g: Gender) => (
                          <option key={g.Id} value={g.Id}>{g.Title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={newClient.DateOfBirth}
                        onChange={(e) => setNewClient({ ...newClient, DateOfBirth: e.target.value })}
                        required
                        max={format(new Date(), 'yyyy-MM-dd')}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${oceanColors.surface}40`, fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                      type="submit"
                      disabled={createClient.isPending}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                        border: 'none',
                        borderRadius: '8px',
                        color: oceanColors.navy,
                        fontWeight: 'bold',
                        cursor: createClient.isPending ? 'not-allowed' : 'pointer',
                        opacity: createClient.isPending ? 0.7 : 1
                      }}
                    >
                      {createClient.isPending ? <RefreshCw size={18} className="animate-spin" /> : 'Register Client'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewClientForm(false)}
                      style={{
                        padding: '14px 24px',
                        background: 'transparent',
                        border: `1px solid ${oceanColors.surface}40`,
                        borderRadius: '8px',
                        color: oceanColors.textLight,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Field Findings Section */}
        {sessionStation && showFindings && selectedClient && (
          <div>
            <button
              onClick={() => {
                setShowFindings(false);
                setSelectedClient(null);
                setSearchTerm('');
              }}
              style={{
                marginBottom: '16px',
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back to Client Selection
            </button>
            
            <FieldFindings
              clientId={selectedClient.Id}
              clientName={selectedClient.FullName}
              stationId={sessionStation}
              onSuccess={handleFindingsSuccess}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
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
