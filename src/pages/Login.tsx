import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Anchor, Ship, Waves, Mail, Lock, Key, Shield, AlertCircle, CheckCircle, User, Phone, Smartphone } from 'lucide-react';

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
  danger: '#EF4444',
};

type LoginMethod = 'password' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithPassword, loginWithOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (loginMethod === 'password') {
        result = await loginWithPassword(identifier, password);
      } else {
        result = await loginWithOTP(identifier);
      }
      
      // After login, we always need OTP verification
      if (result.success && result.requiresOTP) {
        setStep('otp');
        setSuccess('Verification code sent!');
        setTimeout(() => setSuccess(''), 3000);
      } else if (result.success) {
        // This case shouldn't happen with current flow, but handle it
        navigate('/');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyOTP(identifier, otp);
      if (result.success && result.token) {
        // Store token and navigate on success
        navigate('/');
      } else {
        setError(result.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      let result;
      if (loginMethod === 'password') {
        result = await loginWithPassword(identifier, password);
      } else {
        result = await loginWithOTP(identifier);
      }
      
      if (result.success && result.requiresOTP) {
        setSuccess('New verification code sent!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid}, ${oceanColors.light})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '150px',
        background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${oceanColors.surface}20 10px, ${oceanColors.surface}30 20px)`,
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: oceanColors.white,
        borderRadius: '32px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          padding: '32px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <Anchor size={40} style={{ color: oceanColors.navy }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>
            KPA Health Intelligence
          </h1>
          <p style={{ color: oceanColors.foam, margin: '8px 0 0', fontSize: '14px' }}>
            EAP Health Week Portal
          </p>
        </div>

        {/* Login Method Toggle */}
        {step === 'login' && (
          <div style={{
            display: 'flex',
            padding: '16px 32px 0 32px',
            gap: '12px',
            borderBottom: `1px solid ${oceanColors.mid}20`
          }}>
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              style={{
                flex: 1,
                padding: '10px',
                background: loginMethod === 'password' ? oceanColors.gold : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: loginMethod === 'password' ? oceanColors.navy : oceanColors.light,
                fontWeight: loginMethod === 'password' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Lock size={16} />
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('otp')}
              style={{
                flex: 1,
                padding: '10px',
                background: loginMethod === 'otp' ? oceanColors.gold : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: loginMethod === 'otp' ? oceanColors.navy : oceanColors.light,
                fontWeight: loginMethod === 'otp' ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Smartphone size={16} />
              OTP Login
            </button>
          </div>
        )}

        {/* Form */}
        <div style={{ padding: '32px' }}>
          {step === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: oceanColors.deep,
                  marginBottom: '8px'
                }}>
                  Email / Username / Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: oceanColors.light
                  }} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email, username, or phone number"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      border: `1px solid ${oceanColors.mid}30`,
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
                    onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.mid}30`}
                  />
                </div>
              </div>

              {loginMethod === 'password' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: oceanColors.deep,
                    marginBottom: '8px'
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: oceanColors.light
                    }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        border: `1px solid ${oceanColors.mid}30`,
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
                      onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.mid}30`}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '12px',
                  background: `${oceanColors.danger}10`,
                  borderLeft: `3px solid ${oceanColors.danger}`,
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ color: oceanColors.danger }} />
                  <span style={{ fontSize: '13px', color: oceanColors.danger }}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                  border: 'none',
                  borderRadius: '12px',
                  color: oceanColors.navy,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {loading ? 'Sending verification...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `${oceanColors.gold}15`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Shield size={32} style={{ color: oceanColors.gold }} />
                </div>
                <h3 style={{ margin: 0, color: oceanColors.deep }}>Two-Factor Authentication</h3>
                <p style={{ fontSize: '13px', color: oceanColors.light, marginTop: '8px' }}>
                  Enter the verification code sent to<br />
                  <strong>{identifier}</strong>
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: oceanColors.deep,
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  style={{
                    width: '100%',
                    padding: '14px',
                    textAlign: 'center',
                    fontSize: '24px',
                    letterSpacing: '8px',
                    fontFamily: 'monospace',
                    border: `1px solid ${oceanColors.mid}30`,
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
                  onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.mid}30`}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  background: `${oceanColors.danger}10`,
                  borderLeft: `3px solid ${oceanColors.danger}`,
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ color: oceanColors.danger }} />
                  <span style={{ fontSize: '13px', color: oceanColors.danger }}>{error}</span>
                </div>
              )}

              {success && (
                <div style={{
                  padding: '12px',
                  background: `${oceanColors.success}10`,
                  borderLeft: `3px solid ${oceanColors.success}`,
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={16} style={{ color: oceanColors.success }} />
                  <span style={{ fontSize: '13px', color: oceanColors.success }}>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                  border: 'none',
                  borderRadius: '12px',
                  color: oceanColors.navy,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${oceanColors.mid}30`,
                  borderRadius: '12px',
                  color: oceanColors.light,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = oceanColors.gold;
                  e.currentTarget.style.color = oceanColors.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${oceanColors.mid}30`;
                  e.currentTarget.style.color = oceanColors.light;
                }}
              >
                Resend Code
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setOtp('');
                  setError('');
                }}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: oceanColors.light,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Back to Login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 32px',
          background: '#f8fafc',
          textAlign: 'center',
          borderTop: `1px solid ${oceanColors.mid}20`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Waves size={14} style={{ color: oceanColors.surface }} />
            <span style={{ fontSize: '12px', color: oceanColors.light }}>
              Kenya Ports Authority - Secure Health Portal
            </span>
            <Waves size={14} style={{ color: oceanColors.surface }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
