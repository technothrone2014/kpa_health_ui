import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, UserPlus, Activity, FlaskConical, Shield, 
  Users, Calendar, MapPin, ClipboardList, CheckCircle, 
  AlertCircle, Loader2, User, Phone, IdCard, X
} from 'lucide-react';
import api from '../api/client';
import ClientRegistration from './ClientRegistration';
import FieldFindings from './FieldFindings';
import LabFindings from './LabFindings';
import OncologyForm from './OncologyForm';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';


const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  gold: '#FFD700',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

type CaptureStep = 'search' | 'register' | 'field' | 'lab' | 'oncology';
type UserRole = 'field_agent' | 'lab_assistant' | 'oncology_technician';

interface DataCaptureDashboardProps {
  userRole: UserRole;
  userId: number;
  stationId: number;
}

export default function DataCaptureDashboard({ userRole, userId, stationId }: DataCaptureDashboardProps) {
  const [step, setStep] = useState<CaptureStep>('search');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ name: string; type: string } | null>(null);
  const { user } = useAuth();

  // ✅ Session-editable station — starts from the prop, adjustable per session
  const [localStationId, setLocalStationId] = useState<number>(stationId);

  useEffect(() => {
    setLocalStationId(stationId);
  }, [stationId]);

  // Fetch stations for the dropdown (shared cache with FieldFindings)
  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/stations');
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Search for client
  const searchClient = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter ID Number, Name, or Phone Number');
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await api.get(`/clients/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data);
      if (response.data.length === 0) {
        toast(
          userRole === 'lab_assistant'
            ? 'Client not found. Please verify the search term.'
            : 'Client not found. You can register a new client.',
          { icon: 'ℹ️' }
        );
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setStep(userRole === 'lab_assistant' ? 'lab' : 'field');
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleClientRegistered = (clientId: number) => {
    setShowRegistration(false);
    // Fetch the newly registered client
    api.get(`/clients/${clientId}`).then(response => {
      setSelectedClient(response.data);
      setStep('field');
      toast.success('Client registered successfully! Proceed to field findings.');
    });
  };

  const handleFieldSuccess = () => {
    if (userRole === 'field_agent') {
      const name = selectedClient?.FullName || 'Client';
      toast.success('Field findings saved successfully!', { duration: 3000, icon: '✅' });
      setLastSaved({ name, type: 'Field' });
      setTimeout(() => {
        setSelectedClient(null);
        setStep('search');
        setTimeout(() => setLastSaved(null), 4000);
      }, 1500);
    } else {
      setStep('lab');
    }
  };

  const handleLabSuccess = () => {
    if (userRole === 'lab_assistant') {
      const name = selectedClient?.FullName || 'Client';
      toast.success('Lab findings saved successfully!', { duration: 3000, icon: '✅' });
      setLastSaved({ name, type: 'Lab' });
      setTimeout(() => {
        setSelectedClient(null);
        setStep('search');
        // Auto-dismiss the banner after 4 seconds
        setTimeout(() => setLastSaved(null), 4000);
      }, 1500);
    } else {
      setStep('oncology');
    }
  };

  const handleOncologySuccess = () => {
    const name = selectedClient?.FullName || 'Client';
    toast.success('Oncology screening saved successfully!', { duration: 3000, icon: '✅' });
    setLastSaved({ name, type: 'Oncology' });
    setTimeout(() => {
      setSelectedClient(null);
      setStep('search');
      setTimeout(() => setLastSaved(null), 4000);
    }, 1500);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'search':
        return (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {lastSaved && (
              <div
                style={{
                  background: `${oceanColors.success}15`,
                  border: `1px solid ${oceanColors.success}40`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <CheckCircle size={20} style={{ color: oceanColors.success, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: oceanColors.success, fontSize: '14px' }}>
                    {lastSaved.type} findings saved
                  </p>
                  <p style={{ margin: '2px 0 0', color: oceanColors.textLight, fontSize: '12px' }}>
                    {lastSaved.name} • Ready for next client
                  </p>
                </div>
                <button
                  onClick={() => setLastSaved(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: oceanColors.textLight,
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Search size={40} style={{ color: oceanColors.gold }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
                Find Client
              </h2>
              <p style={{ color: oceanColors.textLight, marginTop: '8px' }}>
                Search by ID Number, Name, or Phone Number
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter ID Number, Name, or Phone Number..."
                style={{
                  flex: 1,
                  padding: '14px',
                  border: `1px solid ${oceanColors.mid}30`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onKeyPress={(e) => e.key === 'Enter' && searchClient()}
              />
              <button
                onClick={searchClient}
                disabled={isSearching}
                style={{
                  padding: '14px 24px',
                  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                  border: 'none',
                  borderRadius: '12px',
                  color: oceanColors.mid,
                  fontWeight: 'bold',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                Search
              </button>
            </div>

            {userRole !== 'lab_assistant' && (
              <button
                onClick={() => setShowRegistration(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${oceanColors.mid}30`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: oceanColors.textDark,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <UserPlus size={18} />
                Register New Client
              </button>
            )}

            {searchResults.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: oceanColors.textDark, marginBottom: '12px' }}>
                  Search Results ({searchResults.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map((client) => (
                    <div
                      key={client.Id}
                      onClick={() => handleSelectClient(client)}
                      style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: `1px solid transparent`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = oceanColors.gold;
                        e.currentTarget.style.background = oceanColors.mid;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: oceanColors.textDark }}>{client.FullName}</div>
                          <div style={{ fontSize: '12px', color: oceanColors.textLight, marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <IdCard size={12} /> {client.IDNumber}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {client.PhoneNumber}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {client.StationTitle}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 12px',
                          background: oceanColors.success,
                          color: 'white',
                          borderRadius: '20px',
                          fontSize: '11px'
                        }}>
                          Select
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'field':
        if (!selectedClient) return null;
        return (
          <FieldFindings
            clientId={selectedClient.Id}
            clientName={selectedClient.FullName}
            stationId={localStationId}
            onStationChange={(newId) => {
              setLocalStationId(newId);
              toast.success(
                `Station changed to "${stations?.find((s: any) => s.Id === newId)?.Title ?? newId}" for this session`,
                { icon: '📍' }
              );
            }}
            onSuccess={handleFieldSuccess}
          />
        );

      case 'lab':
        if (!selectedClient) return null;
        return (
          <LabFindings
            clientId={selectedClient.Id}
            clientName={selectedClient.FullName}
            clientIdNumber={selectedClient.IDNumber}
            stationId={localStationId}
            onSuccess={handleLabSuccess}
            onCancel={() => {
              setSelectedClient(null);
              setStep('search');
            }}
          />
        );

      case 'oncology':
        if (!selectedClient) return null;
        return (
          <OncologyForm
            clientId={selectedClient.Id}
            clientName={selectedClient.FullName}
            clientIdNumber={selectedClient.IDNumber}
            genderId={selectedClient.GenderId}
            stationId={localStationId}   // ← changed
            onSuccess={handleOncologySuccess}
          />
        );
        
      default:
        return null;
    }
  };

  const getStepProgress = () => {
    // Lab assistant: only Search → Lab
    if (userRole === 'lab_assistant') {
      return [
        { key: 'search', label: 'Find Client', icon: Search },
        { key: 'lab', label: 'Lab Findings', icon: FlaskConical },
      ];
    }

    // Field agent: Search → Field
    const steps = [
      { key: 'search', label: 'Find Client', icon: Search },
      { key: 'field', label: 'Field Findings', icon: Activity },
    ];

    // Oncology technician: add oncology step
    if (userRole === 'oncology_technician') {
      steps.push({ key: 'oncology', label: 'Oncology', icon: Shield });
    }

    return steps;
  };

  const steps = getStepProgress();
  const currentStepIndex = steps.findIndex(s => s.key === step);
  
  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Progress Steps */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isCompleted = currentStepIndex > idx;
            
            return (
              <React.Fragment key={s.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: isActive ? oceanColors.deep : (isCompleted ? oceanColors.success : '#f0f0f0'),
                    borderRadius: '30px',
                    color: isActive || isCompleted ? 'white' : oceanColors.textLight
                  }}
                >
                  {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                  <span style={{ fontSize: '13px', fontWeight: isActive ? 'bold' : 'normal' }}>{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div style={{ width: '40px', height: '2px', background: '#e0e0e0' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {renderStepContent()}

      {/* Registration Modal */}
      {showRegistration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{ maxWidth: '800px', width: '100%' }}>
            <ClientRegistration
              onSuccess={handleClientRegistered}
              onCancel={() => setShowRegistration(false)}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
