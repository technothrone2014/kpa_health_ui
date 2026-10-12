import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Settings, Activity, Beaker, Plus, Loader2, Power, PowerOff,
  AlertCircle, ChevronLeft, CheckCircle2, Info,
} from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';

const oceanColors = {
  deep: '#0B2F9E', mid: '#1A4D8C', light: '#2B7BA8', surface: '#4AA3C2',
  wave: '#6EC8D9', foam: '#A8E6CF', gold: '#FFD700', navy: '#0A1C40',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  info: '#3B82F6', textDark: '#1F2937', textLight: '#6B7280', white: '#FFFFFF',
};

interface ConfigItem {
  Id: number;
  Title: string;
  Deleted: boolean;
  Status: boolean;
  PostedOn: string;
  UpdatedOn: string;
  usageCount: number | null;
}

type ConfigType = 'referrals' | 'bp-remarks' | 'rbs-remarks';
type ViewState = 'menu' | 'referrals' | 'remarks';
type RemarkTab = 'bp-remarks' | 'rbs-remarks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// Reusable lookup manager — powers Referrals and Remarks views
// ============================================
function LookupManager({
  type,
  title,
  subtitle,
  showUsage = false,
}: {
  type: ConfigType;
  title: string;
  subtitle: string;
  showUsage?: boolean;
}) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config', type],
    queryFn: async () => {
      const r = await api.get(`/admin-config/${type}`);
      return (r.data?.items || []) as ConfigItem[];
    },
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: async (body: { Title: string; LegacyColumn?: string | null }) => {
      const r = await api.post(`/admin-config/${type}`, body);
      return r.data;
    },
    onSuccess: () => {
      toast.success(`"${newTitle}" added.`);
      setNewTitle('');
      qc.invalidateQueries({ queryKey: ['admin-config', type] });
      qc.invalidateQueries({ queryKey: ['referral-values'] });
      qc.invalidateQueries({ queryKey: ['bp-remark-values'] });
      qc.invalidateQueries({ queryKey: ['rbs-remark-values'] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, Deleted }: { id: number; Deleted: boolean }) => {
      setPendingToggleId(id);
      const r = await api.patch(`/admin-config/${type}/${id}`, { Deleted });
      return r.data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.Deleted ? 'Deactivated' : 'Reactivated');
      qc.invalidateQueries({ queryKey: ['admin-config', type] });
      qc.invalidateQueries({ queryKey: ['referral-values'] });
      qc.invalidateQueries({ queryKey: ['bp-remark-values'] });
      qc.invalidateQueries({ queryKey: ['rbs-remark-values'] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Failed to update'),
    onSettled: () => setPendingToggleId(null),
  });

  const handleCreate = useCallback(() => {
    const t = newTitle.trim();
    if (t.length < 2) {
      toast.error('Title must be at least 2 characters');
      return;
    }
    createMut.mutate({ Title: t });
  }, [newTitle, createMut]);

  const items = data || [];
  const activeCount = items.filter(i => !i.Deleted).length;
  const inactiveCount = items.filter(i => i.Deleted).length;

  return (
    <div>
      {/* Header / summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '8px',
      }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
            {title}
          </h4>
          <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '2px 0 0' }}>
            {subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
          <span style={{
            background: `${oceanColors.success}15`, color: oceanColors.success,
            padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold',
          }}>{activeCount} active</span>
          {inactiveCount > 0 && (
            <span style={{
              background: `${oceanColors.textLight}15`, color: oceanColors.textLight,
              padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold',
            }}>{inactiveCount} inactive</span>
          )}
        </div>
      </div>

      {/* Add form */}
      <div style={{
        background: '#f8fafc', padding: '12px', borderRadius: '10px',
        marginBottom: '16px', border: `1px solid ${oceanColors.mid}15`,
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="New title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              flex: 1, minWidth: '180px', padding: '10px 12px',
              borderRadius: '8px', border: `1px solid ${oceanColors.mid}30`,
              fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={createMut.isPending || newTitle.trim().length < 2}
            style={{
              padding: '10px 20px',
              background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
              border: 'none', borderRadius: '8px',
              color: oceanColors.navy, fontWeight: 'bold', fontSize: '13px',
              cursor: createMut.isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: createMut.isPending || newTitle.trim().length < 2 ? 0.6 : 1,
            }}
          >
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: oceanColors.deep }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px',
          background: '#f8fafc', borderRadius: '12px',
          color: oceanColors.textLight, fontSize: '13px',
        }}>
          No items yet. Add the first one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item) => (
            <div
              key={item.Id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: item.Deleted ? '#f8fafc' : 'white',
                border: `1px solid ${item.Deleted ? '#e2e8f0' : `${oceanColors.mid}25`}`,
                borderRadius: '8px',
                opacity: item.Deleted ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <span style={{
                  fontWeight: '600', fontSize: '13px',
                  color: item.Deleted ? oceanColors.textLight : oceanColors.textDark,
                  textDecoration: item.Deleted ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.Title}
                </span>
                {item.Deleted && (
                  <span style={{
                    fontSize: '10px', background: oceanColors.textLight,
                    color: 'white', padding: '2px 8px', borderRadius: '8px',
                    fontWeight: 'bold', textTransform: 'uppercase',
                  }}>inactive</span>
                )}
                {showUsage && item.usageCount !== null && item.usageCount > 0 && (
                  <span
                    title="Historical records reference this item"
                    style={{
                      fontSize: '10px', background: `${oceanColors.info}15`,
                      color: oceanColors.info, padding: '2px 8px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', gap: '3px',
                    }}
                  >
                    <Info size={10} /> {item.usageCount} uses
                  </span>
                )}
              </div>

              <button
                onClick={() => toggleMut.mutate({ id: item.Id, Deleted: !item.Deleted })}
                disabled={pendingToggleId === item.Id}
                title={item.Deleted ? 'Reactivate — show in clerk forms again' : 'Deactivate — hide from clerk forms (keeps history)'}
                style={{
                  padding: '6px 12px', borderRadius: '8px',
                  border: `1px solid ${item.Deleted ? oceanColors.success + '40' : oceanColors.danger + '40'}`,
                  background: item.Deleted ? `${oceanColors.success}10` : `${oceanColors.danger}10`,
                  color: item.Deleted ? oceanColors.success : oceanColors.danger,
                  fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  flexShrink: 0, marginLeft: '8px',
                }}
              >
                {pendingToggleId === item.Id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : item.Deleted ? (
                  <><Power size={12} /> Reactivate</>
                ) : (
                  <><PowerOff size={12} /> Deactivate</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main modal
// ============================================
export default function TechnicalConfigModal({ isOpen, onClose }: Props) {
  const [view, setView] = useState<ViewState>('menu');
  const [remarkTab, setRemarkTab] = useState<RemarkTab>('bp-remarks');

  // Reset to menu on close
  useEffect(() => {
    if (!isOpen) {
      setView('menu');
      setRemarkTab('bp-remarks');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
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
        maxWidth: '760px', maxHeight: '90vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          padding: '20px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `2px solid ${oceanColors.gold}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={24} style={{ color: oceanColors.gold }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Technical Configuration
              </h2>
              <p style={{ fontSize: '12px', color: oceanColors.foam, marginTop: '2px' }}>
                Manage dynamic lists used across data capture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: '8px', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* === MENU VIEW === */}
          {view === 'menu' && (
            <div>
              <p style={{
                fontSize: '13px', color: oceanColors.textLight,
                marginBottom: '16px',
              }}>
                Select a configuration category to manage.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}>
                <MenuCard
                  icon={<Activity size={28} />}
                  title="Referrals"
                  description="Manage referral options shown on the field findings form"
                  onClick={() => setView('referrals')}
                />
                <MenuCard
                  icon={<Beaker size={28} />}
                  title="Remarks"
                  description="Manage medication-status remarks for BP and RBS"
                  onClick={() => setView('remarks')}
                />
              </div>
            </div>
          )}

          {/* === REFERRALS VIEW === */}
          {view === 'referrals' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                background: `${oceanColors.info}10`, border: `1px solid ${oceanColors.info}30`,
                borderRadius: '10px', padding: '12px', marginBottom: '16px',
              }}>
                <AlertCircle size={16} style={{ color: oceanColors.info, flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', color: oceanColors.textDark, margin: 0, lineHeight: 1.5 }}>
                  Existing referrals <strong>cannot be edited or deleted permanently</strong> — this preserves historical records.
                  Deactivate to hide from clerk forms. Historical entries remain linked.
                </p>
              </div>
              <LookupManager
                type="referrals"
                title="Referrals"
                subtitle="Shown as checkboxes on the field findings form"
                showUsage
              />
            </div>
          )}

          {/* === REMARKS VIEW === */}
          {view === 'remarks' && (
            <div>
              <BackButton onClick={() => setView('menu')} />
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                background: `${oceanColors.info}10`, border: `1px solid ${oceanColors.info}30`,
                borderRadius: '10px', padding: '12px', marginBottom: '16px',
              }}>
                <AlertCircle size={16} style={{ color: oceanColors.info, flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', color: oceanColors.textDark, margin: 0, lineHeight: 1.5 }}>
                  Remarks record whether a client is on medication. Deactivating only affects <strong>future</strong> data capture — historical entries stay linked.
                </p>
              </div>

              {/* BP / RBS tabs */}
              <div style={{
                display: 'flex', gap: '4px', marginBottom: '16px',
                background: '#f1f5f9', padding: '4px', borderRadius: '10px',
                width: 'fit-content',
              }}>
                {([
                  { key: 'bp-remarks' as const, label: 'Blood Pressure' },
                  { key: 'rbs-remarks' as const, label: 'Blood Sugar' },
                ]).map((tab) => {
                  const active = remarkTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setRemarkTab(tab.key)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none',
                        background: active ? oceanColors.deep : 'transparent',
                        color: active ? 'white' : oceanColors.textLight,
                        fontWeight: active ? 'bold' : 'normal',
                        fontSize: '12px', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {remarkTab === 'bp-remarks' ? (
                <LookupManager
                  type="bp-remarks"
                  title="Blood Pressure Remarks"
                  subtitle="Medication status options for BP"
                />
              ) : (
                <LookupManager
                  type="rbs-remarks"
                  title="Blood Sugar Remarks"
                  subtitle="Medication status options for RBS"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================
function MenuCard({
  icon, title, description, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '20px', borderRadius: '14px',
        background: 'white', border: `1px solid ${oceanColors.mid}25`,
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        gap: '10px', transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = oceanColors.gold;
        e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(11,47,158,0.25)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${oceanColors.mid}25`;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `linear-gradient(135deg, ${oceanColors.deep}15, ${oceanColors.mid}15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: oceanColors.deep,
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: oceanColors.textDark, margin: 0 }}>
          {title}
        </h4>
        <p style={{ fontSize: '12px', color: oceanColors.textLight, margin: '4px 0 0', lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'transparent', border: 'none',
        color: oceanColors.textLight, fontSize: '12px',
        cursor: 'pointer', padding: 0, marginBottom: '12px',
      }}
    >
      <ChevronLeft size={14} /> Back to configuration menu
    </button>
  );
}
