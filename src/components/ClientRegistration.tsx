import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserPlus, Save, X, Search, User, Phone, MapPin, Briefcase, 
  Anchor, Calendar, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  gold: '#FFD700',
  navy: '#0A1C40',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

interface ClientData {
  Id?: number;
  UserId: number;
  IDNumber: string;
  FullName: string;
  FirstName: string;
  LastName: string;
  GenderId: number;
  PhoneNumber: string;
  CategoryId: number;
  StationId: number;
  DateOfBirth: string;
  Age?: number;  // Added Age as optional property
}

interface ClientRegistrationProps {
  onSuccess?: (clientId: number) => void;
  onCancel?: () => void;
  initialData?: Partial<ClientData>;
}

export default function ClientRegistration({ onSuccess, onCancel, initialData }: ClientRegistrationProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ClientData>>({
    UserId: 1, // TODO: Get from logged-in user
    IDNumber: '',
    FullName: '',
    FirstName: '',
    LastName: '',
    GenderId: 1,
    PhoneNumber: '',
    CategoryId: 1,
    StationId: 1,
    DateOfBirth: '',
    ...initialData,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/analytics/clients/category');
      return response.data;
    },
  });

  // Fetch stations for dropdown
  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const response = await api.get('/analytics/clients/category-station');
      return response.data;
    },
  });

  // Search existing clients
  const searchClient = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const response = await api.get(`/clients/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Register client mutation
  const registerClient = useMutation({
    mutationFn: async (data: Partial<ClientData>) => {
      const response = await api.post('/clients/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Client registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (onSuccess) onSuccess(data.Id);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.IDNumber?.trim()) newErrors.IDNumber = 'ID Number is required';
    if (!formData.FirstName?.trim()) newErrors.FirstName = 'First name is required';
    if (!formData.LastName?.trim()) newErrors.LastName = 'Last name is required';
    if (!formData.DateOfBirth) newErrors.DateOfBirth = 'Date of birth is required';
    if (!formData.PhoneNumber?.trim()) newErrors.PhoneNumber = 'Phone number is required';
    
    // Validate age (must be at least 18)
    if (formData.DateOfBirth) {
      const age = calculateAge(formData.DateOfBirth);
      if (age < 18) newErrors.DateOfBirth = 'Client must be at least 18 years old';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    // Calculate age from DOB and add to form data
    const age = calculateAge(formData.DateOfBirth!);
    // Create a new object with the age property
    const submitData = { ...formData, Age: age };
    registerClient.mutate(submitData);
  };

  const handleSelectExistingClient = (client: any) => {
    setFormData({
      ...formData,
      Id: client.Id,
      FullName: client.FullName,
      FirstName: client.FirstName,
      LastName: client.LastName,
      IDNumber: client.IDNumber,
      PhoneNumber: client.PhoneNumber,
    });
    setSearchResults([]);
    setSearchTerm('');
    if (onSuccess) onSuccess(client.Id);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserPlus size={20} style={{ color: oceanColors.gold }} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
              {initialData?.Id ? 'Edit Client' : 'Register New Client'}
            </h2>
            <p style={{ fontSize: '13px', color: oceanColors.textLight, marginTop: '4px' }}>
              Capture client biographical information
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: oceanColors.textLight
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Client Search Section */}
      <div style={{
        background: '#f8fafc',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, marginBottom: '8px', display: 'block' }}>
          Search Existing Client
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID Number, Name, or Phone Number..."
            style={{
              flex: 1,
              padding: '10px 12px',
              border: `1px solid ${oceanColors.mid}30`,
              borderRadius: '8px',
              outline: 'none'
            }}
            onKeyPress={(e) => e.key === 'Enter' && searchClient()}
          />
          <button
            onClick={searchClient}
            disabled={isSearching}
            style={{
              padding: '10px 20px',
              background: oceanColors.deep,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div style={{ marginTop: '12px', maxHeight: '200px', overflow: 'auto' }}>
            {searchResults.map((client) => (
              <div
                key={client.Id}
                onClick={() => handleSelectExistingClient(client)}
                style={{
                  padding: '12px',
                  borderBottom: `1px solid ${oceanColors.mid}20`,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = oceanColors.gold}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 'bold', color: oceanColors.textDark }}>{client.FullName}</div>
                <div style={{ fontSize: '12px', color: oceanColors.textLight }}>
                  ID: {client.IDNumber} | Phone: {client.PhoneNumber}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* ID Number */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              ID Number *
            </label>
            <input
              type="text"
              value={formData.IDNumber}
              onChange={(e) => setFormData({ ...formData, IDNumber: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.IDNumber ? oceanColors.danger : oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            {errors.IDNumber && <span style={{ fontSize: '11px', color: oceanColors.danger }}>{errors.IDNumber}</span>}
          </div>

          {/* Full Name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.FullName}
              onChange={(e) => setFormData({ ...formData, FullName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {/* First Name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              First Name *
            </label>
            <input
              type="text"
              value={formData.FirstName}
              onChange={(e) => setFormData({ ...formData, FirstName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.FirstName ? oceanColors.danger : oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            {errors.FirstName && <span style={{ fontSize: '11px', color: oceanColors.danger }}>{errors.FirstName}</span>}
          </div>

          {/* Last Name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Last Name *
            </label>
            <input
              type="text"
              value={formData.LastName}
              onChange={(e) => setFormData({ ...formData, LastName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.LastName ? oceanColors.danger : oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            {errors.LastName && <span style={{ fontSize: '11px', color: oceanColors.danger }}>{errors.LastName}</span>}
          </div>

          {/* Date of Birth */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Date of Birth *
            </label>
            <input
              type="date"
              value={formData.DateOfBirth}
              onChange={(e) => setFormData({ ...formData, DateOfBirth: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.DateOfBirth ? oceanColors.danger : oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            {errors.DateOfBirth && <span style={{ fontSize: '11px', color: oceanColors.danger }}>{errors.DateOfBirth}</span>}
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.PhoneNumber}
              onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.PhoneNumber ? oceanColors.danger : oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            {errors.PhoneNumber && <span style={{ fontSize: '11px', color: oceanColors.danger }}>{errors.PhoneNumber}</span>}
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Gender
            </label>
            <select
              value={formData.GenderId}
              onChange={(e) => setFormData({ ...formData, GenderId: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            >
              <option value="1">Male</option>
              <option value="2">Female</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={formData.CategoryId}
              onChange={(e) => setFormData({ ...formData, CategoryId: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            >
              <option value="1">EMPLOYEE</option>
              <option value="2">DEPENDENT</option>
              <option value="3">PORT USER</option>
            </select>
          </div>

          {/* Station */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: oceanColors.textDark, display: 'block', marginBottom: '6px' }}>
              Station
            </label>
            <select
              value={formData.StationId}
              onChange={(e) => setFormData({ ...formData, StationId: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                outline: 'none'
              }}
            >
              <option value="1">BANDARI CLINIC</option>
              <option value="2">SHIFT MANAGER</option>
              <option value="3">KAPENGURIA</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                background: 'white',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: oceanColors.textDark
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={registerClient.isPending}
            style={{
              padding: '10px 24px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none',
              borderRadius: '8px',
              color: oceanColors.navy,
              fontWeight: 'bold',
              cursor: registerClient.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: registerClient.isPending ? 0.7 : 1
            }}
          >
            {registerClient.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {initialData?.Id ? 'Update Client' : 'Register Client'}
          </button>
        </div>
      </form>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
