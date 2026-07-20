'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  full_name: string;
  position: string;
}

interface FaceIdModalProps {
  employee: Employee;
  mode: 'register' | 'checkin';
  onClose: () => void;
  onSuccess: (message: string) => void;
}

type Step = 'idle' | 'loading' | 'scanning' | 'success' | 'error';

// ── WebAuthn helpers ──────────────────────────────────────────────────────────

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FaceIdModal({ employee, mode, onClose, onSuccess }: FaceIdModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('idle');
  const [message, setMessage] = useState('');
  const [hasCredential, setHasCredential] = useState<boolean | null>(null);
  const [todayRecord, setTodayRecord] = useState<{ id: string; check_in_time: string | null; check_out_time: string | null } | null>(null);

  const isSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const checkExistingCredential = useCallback(async () => {
    const { data } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('employee_id', employee.id)
      .maybeSingle();
    setHasCredential(!!data);
  }, [employee.id]);

  const checkTodayAttendance = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time')
      .eq('employee_id', employee.id)
      .eq('attendance_date', today)
      .maybeSingle();
    setTodayRecord(data);
  }, [employee.id]);

  useEffect(() => {
    checkExistingCredential();
    if (mode === 'checkin') checkTodayAttendance();
  }, [checkExistingCredential, checkTodayAttendance, mode]);

  // ── Register Face ID ────────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (!isSupported) {
      setMessage('Bu brauzer Face ID / WebAuthn ni qo\'llab-quvvatlamaydi.');
      setStep('error');
      return;
    }
    setStep('scanning');
    setMessage('Yuzingizni skanerlang...');
    try {
      const challenge = generateChallenge();
      const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge as unknown as BufferSource,
          rp: { name: 'CCTV ERP', id: rpId },
          user: {
            id: new TextEncoder().encode(employee.id) as unknown as BufferSource,
            name: employee.full_name,
            displayName: employee.full_name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('Credential yaratilmadi');

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = bufferToBase64url(credential.rawId);
      const publicKey = bufferToBase64url(response.getPublicKey() || new ArrayBuffer(0));

      // Delete old credential if exists
      await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('employee_id', employee.id);

      const { error } = await supabase.from('webauthn_credentials').insert({
        employee_id: employee.id,
        credential_id: credentialId,
        public_key: publicKey,
        counter: 0,
        device_type: 'platform',
      });

      if (error) throw error;

      setStep('success');
      setMessage('Face ID muvaffaqiyatli ro\'yxatdan o\'tkazildi!');
      setHasCredential(true);
      setTimeout(() => {
        onSuccess(`${employee.full_name} uchun Face ID ro\'yxatdan o\'tkazildi`);
      }, 1500);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setMessage('Face ID bekor qilindi yoki ruxsat berilmadi.');
      } else if (err?.name === 'NotSupportedError') {
        setMessage('Qurilma Face ID / biometrik autentifikatsiyani qo\'llab-quvvatlamaydi.');
      } else {
        setMessage(err?.message || 'Face ID ro\'yxatdan o\'tkazishda xato yuz berdi.');
      }
      setStep('error');
    }
  };

  // ── Check In / Check Out ────────────────────────────────────────────────────

  const handleCheckInOut = async () => {
    if (!isSupported) {
      setMessage('Bu brauzer Face ID / WebAuthn ni qo\'llab-quvvatlamaydi.');
      setStep('error');
      return;
    }
    if (!hasCredential) {
      setMessage('Avval Face ID ni ro\'yxatdan o\'tkazing.');
      setStep('error');
      return;
    }

    setStep('scanning');
    setMessage('Yuzingizni skanerlang...');

    try {
      // Fetch stored credential
      const { data: cred, error: credErr } = await supabase
        .from('webauthn_credentials')
        .select('credential_id, counter')
        .eq('employee_id', employee.id)
        .single();

      if (credErr || !cred) throw new Error('Saqlangan credential topilmadi');

      const challenge = generateChallenge();
      const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge as unknown as BufferSource,
          rpId,
          allowCredentials: [
            {
              id: base64urlToBuffer(cred.credential_id) as BufferSource,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) throw new Error('Autentifikatsiya bekor qilindi');

      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;
      const newCounter = new DataView(assertionResponse.authenticatorData).getUint32(33, false);

      // Update counter
      await supabase
        .from('webauthn_credentials')
        .update({ counter: newCounter, last_used_at: new Date().toISOString() })
        .eq('employee_id', employee.id);

      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
      const today = now.toISOString().split('T')[0];

      if (!todayRecord) {
        // Check In
        const hour = now.getHours();
        const status = hour < 9 ? 'present' : hour < 10 ? 'late' : 'late';

        const { error: insErr } = await supabase.from('attendance').insert({
          employee_id: employee.id,
          attendance_date: today,
          attendance_status: status,
          check_in_time: timeStr,
          verified_by_face_id: true,
        });
        if (insErr) throw insErr;

        setStep('success');
        setMessage(`Kirish vaqti: ${timeStr}`);
        setTimeout(() => {
          onSuccess(`${employee.full_name} — Kirish: ${timeStr}`);
        }, 1500);
      } else if (!todayRecord.check_out_time) {
        // Check Out
        const { error: updErr } = await supabase
          .from('attendance')
          .update({ check_out_time: timeStr })
          .eq('id', todayRecord.id);
        if (updErr) throw updErr;

        setStep('success');
        setMessage(`Chiqish vaqti: ${timeStr}`);
        setTimeout(() => {
          onSuccess(`${employee.full_name} — Chiqish: ${timeStr}`);
        }, 1500);
      } else {
        setStep('success');
        setMessage('Bugun kirish va chiqish allaqachon qayd etilgan.');
        setTimeout(onClose, 2000);
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setMessage('Face ID bekor qilindi yoki ruxsat berilmadi.');
      } else {
        setMessage(err?.message || 'Autentifikatsiyada xato yuz berdi.');
      }
      setStep('error');
    }
  };

  // ── Derived UI state ────────────────────────────────────────────────────────

  const isCheckIn = mode === 'checkin';
  const actionLabel = isCheckIn
    ? todayRecord?.check_in_time
      ? todayRecord.check_out_time
        ? 'Bugun qayd etilgan' :'Chiqishni qayd etish' :'Kirishni qayd etish'
    : hasCredential
    ? 'Face ID ni yangilash' :'Face ID ni ro\'yxatdan o\'tkazish';

  const iconName =
    step === 'success' ?'CheckCircleIcon'
      : step === 'error' ?'ExclamationCircleIcon'
      : step === 'scanning' ?'FaceSmileIcon'
      : isCheckIn
      ? 'FingerPrintIcon' :'IdentificationIcon';

  const iconColor =
    step === 'success' ?'var(--success)'
      : step === 'error' ?'var(--danger)' :'var(--primary)';

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {isCheckIn ? 'Face ID Davomat' : 'Face ID Ro\'yxatdan o\'tkazish'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
          >
            <AppIcon name="XMarkIcon" size={18} />
          </button>
        </div>

        {/* Employee info */}
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--secondary)' }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            {employee.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{employee.full_name}</p>
            <p className="text-xs text-muted-foreground">{employee.position || '—'}</p>
          </div>
        </div>

        {/* Today's status (check-in mode) */}
        {isCheckIn && todayRecord && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <p className="text-muted-foreground">Kirish</p>
              <p className="font-mono font-semibold" style={{ color: 'var(--success)' }}>
                {todayRecord.check_in_time || '—'}
              </p>
            </div>
            <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <p className="text-muted-foreground">Chiqish</p>
              <p className="font-mono font-semibold" style={{ color: 'var(--danger)' }}>
                {todayRecord.check_out_time || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Icon area */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              step === 'scanning' ? 'animate-pulse' : ''
            }`}
            style={{ background: `${iconColor}18` }}
          >
            <AppIcon name={iconName as any} size={40} style={{ color: iconColor }} />
          </div>

          {step === 'idle' && (
            <p className="text-sm text-muted-foreground text-center">
              {isCheckIn
                ? hasCredential === false
                  ? 'Face ID ro\'yxatdan o\'tkazilmagan. Avval ro\'yxatdan o\'ting.' :'Davomat qayd etish uchun Face ID dan foydalaning' :'Qurilmangizning Face ID yoki biometrik autentifikatsiyasidan foydalaniladi'}
            </p>
          )}
          {step === 'scanning' && (
            <p className="text-sm text-center" style={{ color: 'var(--primary)' }}>
              {message}
            </p>
          )}
          {step === 'success' && (
            <p className="text-sm font-medium text-center" style={{ color: 'var(--success)' }}>
              {message}
            </p>
          )}
          {step === 'error' && (
            <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
              {message}
            </p>
          )}
        </div>

        {/* Not supported warning */}
        {!isSupported && (
          <div
            className="p-3 rounded-lg text-xs flex items-start gap-2"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
          >
            <AppIcon name="ExclamationTriangleIcon" size={14} className="mt-0.5 flex-shrink-0" />
            <span>Bu brauzer WebAuthn / Face ID ni qo'llab-quvvatlamaydi. HTTPS yoki localhost talab qilinadi.</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">
            Yopish
          </button>
          {step !== 'success' && (
            <button
              onClick={isCheckIn ? handleCheckInOut : handleRegister}
              disabled={
                step === 'scanning' ||
                step === 'loading' ||
                !isSupported ||
                (isCheckIn && hasCredential === false) ||
                (isCheckIn && !!todayRecord?.check_out_time)
              }
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              {step === 'scanning' && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {step === 'error' ? 'Qayta urinish' : actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
