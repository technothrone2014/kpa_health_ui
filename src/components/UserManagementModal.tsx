import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, Search, Pencil, Power, PowerOff, X, Loader2,
  CheckCircle, Loader2 as Loader,
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const oceanColors = {
  deep: '#0B2F9E', mid: '#1A4D8C', light: '#2B7BA8', surface: '#4AA3C2',
  gold: '#FFD700', navy: '#0A1C40', success: '#10B981', warning: '#F59E0B',
  danger: '#EF4444', info: '#3B82F6', textDark: '#1F2937', textLight: '#6B7280',
  white: '#FFFFFF',
};

interface Role { Id: number; Name: string; NormalizedName?: string; }
interface UserRow {
  Id: number;
  FirstName: string;
  LastName: string;
  FullName: string;
  Email: string;
  UserName: string;
  PhoneNumber: string;
  Status: boolean;
  Roles: Role[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm = {
  FirstName: '', LastName: '', Email: '', PhoneNumber: '',
  UserName: '', Password: '', RoleIds: [] as number[],
};

// ============================================
// Inner form modal — Create/Edit user
// ============================================
function UserFormModal({
  editingUser, roles, onClose, onSaved,
}: {
  editingUser: UserRow | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    ...emptyForm,
    ...(editingUser ? {
      FirstName: editingUser.FirstName || '',
      LastName: editingUser.LastName || '',
      Email: editingUser.Email || '',
      PhoneNumber: editingUser.PhoneNumber || '',
      UserName: editingUser.UserName || '',
      RoleIds: (editingUser.Roles || []).map((r) => r.Id),
    } : {}),
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1px solid ${oceanColors.mid}30`, fontSize: '14px',
    outline: 'none', background: 'white',
  };

  const createMut = useMutation({
    mutationFn: async (body: any) => (await api.post('/users', body)).data,
    onSuccess: () => {
      toast.success('User created successfully', { icon: '✅' });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onSaved();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create user'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) =>
      (await api.put(`/users/${id}`, body)).data,
    onSuccess: () => {
      toast.success('User updated successfully', { icon: '✅' });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onSaved();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update user'),
  });

  const toggleRole = (roleId: number) => {
    setFormData((prev) => ({
      ...prev,
      RoleIds: prev.RoleIds.includes(roleId)
        ? prev.RoleIds.filter((id) => id !== roleId)
        : [...prev.RoleIds, roleId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.FirstName || !formData.LastName || !formData.Email || !formData.PhoneNumber) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingUser && !formData.Password) {
      toast.error('Password is required for new users');
      return;
    }
    if (formData.Password && formData.Password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (formData.RoleIds.length === 0) {
      toast.error('Please assign at least one role');
      return;
    }

    if (editingUser) {
      const { Password, ...rest } = formData;
      updateMut.mutate({ id: editingUser.Id, body: rest });
    } else {
      createMut.mutate(formData);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200, padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: '20px', width: '100%',
        maxWidth: '640px', maxHeight: '90vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          padding: '18px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `2px solid ${oceanColors.gold}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {editingUser
              ? <Pencil size={20} style={{ color: oceanColors.gold }} />
              : <UserPlus size={20} style={{ color: oceanColors.gold }} />}
            <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: 'white', margin: 0 }}>
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '8px', width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white',
          }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input type="text" value={formData.FirstName}
                onChange={(e) => setFormData({ ...formData, FirstName: e.target.value })}
                style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input type="text" value={formData.LastName}
                onChange={(e) => setFormData({ ...formData, LastName: e.target.value })}
                style={inputStyle} required />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={formData.Email}
                onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input type="tel" value={formData.PhoneNumber}
                onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
                style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Username</label>
              <input type="text" placeholder="Auto from email"
                value={formData.UserName}
                onChange={(e) => setFormData({ ...formData, UserName: e.target.value })}
                style={inputStyle} />
            </div>
            {!editingUser && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Initial Password * (min 8 chars)</label>
                <input type="password" value={formData.Password}
                  onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                  style={inputStyle} required />
              </div>
            )}
          </div>

          <div style={{ marginTop: '18px' }}>
            <label style={labelStyle}>Roles * (select at least one)</label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px',
              background: '#f8fafc', padding: '12px', borderRadius: '10px',
            }}>
              {roles.map((r) => (
                <label key={r.Id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  cursor: 'pointer', fontSize: '13px', color: oceanColors.textDark,
                }}>
                  <input type="checkbox"
                    checked={formData.RoleIds.includes(r.Id)}
                    onChange={() => toggleRole(r.Id)} />
                  {r.Name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '22px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', background: 'white',
              border: `1px solid ${oceanColors.mid}30`, borderRadius: '10px',
              cursor: 'pointer', color: oceanColors.textDark, fontWeight: '600',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending} style={{
              flex: 2, padding: '12px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none', borderRadius: '10px',
              color: oceanColors.navy, fontWeight: 'bold',
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: isPending ? 0.7 : 1,
            }}>
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Main modal — user list + controls
// ============================================
export default function UserManagementModal({ isOpen, onClose }: Props) {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return (res.data?.data || []) as UserRow[];
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get('/users/roles/all');
      return (res.data?.data || []) as Role[];
    },
    enabled: isOpen,
    staleTime: 30 * 60 * 1000,
  });

  const filteredUsers = useMemo(() => {
    const list = usersData || [];
    const term = searchTerm.trim().toLowerCase();
    return list.filter((u) => {
      const matchesSearch = !term ||
        u.FullName?.toLowerCase().includes(term) ||
        u.Email?.toLowerCase().includes(term) ||
        u.PhoneNumber?.includes(term);
      const matchesRole = roleFilter === 'all' ||
        (u.Roles || []).some((r) => r.Name === roleFilter);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && u.Status) ||
        (statusFilter === 'inactive' && !u.Status);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersData, searchTerm, roleFilter, statusFilter]);

  const toggleMut = useMutation({
    mutationFn: async ({ id, Status }: { id: number; Status: boolean }) => {
      setPendingToggleId(id);
      return (await api.patch(`/users/${id}/status`, { Status })).data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.Status ? 'User activated' : 'User deactivated', { icon: '✅' });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update status'),
    onSettled: () => setPendingToggleId(null),
  });

  const openCreate = () => { setEditingUser(null); setShowFormModal(true); };
  const openEdit = (user: UserRow) => { setEditingUser(user); setShowFormModal(true); };
  const closeFormModal = () => { setShowFormModal(false); setEditingUser(null); };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1px solid ${oceanColors.mid}30`, fontSize: '14px',
    outline: 'none', background: 'white',
  };

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1100, padding: '20px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background: 'white', borderRadius: '20px', width: '100%',
          maxWidth: '1200px', maxHeight: '92vh', display: 'flex',
          flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
        }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
            padding: '18px 24px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `2px solid ${oceanColors.gold}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={22} style={{ color: oceanColors.gold }} />
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  Manage Users
                </h2>
                <p style={{ fontSize: '12px', color: oceanColors.white, marginTop: '2px' }}>
                  Create, edit, activate, or deactivate system users
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={openCreate} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                border: 'none', borderRadius: '10px',
                color: oceanColors.navy, fontWeight: 'bold',
                fontSize: '13px', cursor: 'pointer',
              }}>
                <UserPlus size={16} /> Add User
              </button>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
              }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{
            padding: '16px 24px', background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', gap: '12px', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: oceanColors.textLight,
              }} />
              <input type="text" placeholder="Search by name, email, or phone…"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '38px' }} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              style={{ ...inputStyle, maxWidth: '180px' }}>
              <option value="all">All Roles</option>
              {roles?.map((r) => <option key={r.Id} value={r.Name}>{r.Name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ ...inputStyle, maxWidth: '150px' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: oceanColors.deep }} />
                <p style={{ marginTop: '12px', color: oceanColors.textLight }}>Loading users…</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <Users size={48} style={{ color: oceanColors.textLight, opacity: 0.4 }} />
                <p style={{ marginTop: '12px', color: oceanColors.textLight }}>
                  No users match the current filters.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Roles</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.Id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '600', color: oceanColors.textDark }}>
                          {u.FullName || `${u.FirstName} ${u.LastName}`}
                        </div>
                        <div style={{ fontSize: '11px', color: oceanColors.textLight }}>
                          @{u.UserName}
                        </div>
                      </td>
                      <td style={tdStyle}>{u.Email}</td>
                      <td style={tdStyle}>{u.PhoneNumber}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(u.Roles || []).map((r) => (
                            <span key={r.Id} style={{
                              fontSize: '11px', fontWeight: 'bold',
                              padding: '3px 8px', borderRadius: '10px',
                              background: `${oceanColors.info}15`, color: oceanColors.info,
                            }}>{r.Name}</span>
                          ))}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: '11px', fontWeight: 'bold',
                          padding: '3px 10px', borderRadius: '10px',
                          background: u.Status ? `${oceanColors.success}15` : `${oceanColors.danger}15`,
                          color: u.Status ? oceanColors.success : oceanColors.danger,
                        }}>{u.Status ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => openEdit(u)} title="Edit user"
                          style={actionBtnStyle(oceanColors.deep)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleMut.mutate({ id: u.Id, Status: !u.Status })}
                          disabled={pendingToggleId === u.Id}
                          title={u.Status ? 'Deactivate' : 'Activate'}
                          style={actionBtnStyle(u.Status ? oceanColors.danger : oceanColors.success, true)}>
                          {pendingToggleId === u.Id
                            ? <Loader2 size={14} className="animate-spin" />
                            : u.Status ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showFormModal && (
        <UserFormModal
          editingUser={editingUser}
          roles={roles || []}
          onClose={closeFormModal}
          onSaved={closeFormModal}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </>
  );
}

// Style constants
const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left',
  fontSize: '12px', fontWeight: 'bold',
  color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px',
};
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: '13px', color: '#334155',
};
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: '600',
  color: oceanColors.textDark, display: 'block', marginBottom: '4px',
};
const actionBtnStyle = (color: string, ml = false): React.CSSProperties => ({
  background: `${color}10`,
  border: `1px solid ${color}40`,
  color: color, borderRadius: '8px',
  padding: '6px 10px', cursor: 'pointer',
  marginLeft: ml ? '6px' : 0,
  display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
});
