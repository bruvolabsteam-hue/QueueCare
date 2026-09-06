/* eslint-disable */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClinic } from '../../context/ClinicContext';

export default function DoctorDetailsModal() {
  const router = useRouter();
  const { doctors, activeDoctorModal, closeDoctorDetails, openDoctorDetails } = useClinic();
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!activeDoctorModal) return null;

  const doc = activeDoctorModal;

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={closeDoctorDetails}>
      <div style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #ebdcc9'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header with Doctor Selector Tabs */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #FCF4E7 0%, #ffffff 100%)',
          borderBottom: '1px solid #ebdcc9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>👨‍⚕️</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Clinic Doctors & Specialists
              </h3>
            </div>
            <button
              onClick={closeDoctorDetails}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#64748b',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem'
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Doctor Switcher Chips */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem'
          }}>
            {doctors.map(d => {
              const isSelected = d.id === doc.id;
              return (
                <button
                  key={d.id}
                  onClick={() => openDoctorDetails(d)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? '700' : '500',
                    border: isSelected ? '2px solid #38B6FF' : '1px solid #cbd5e1',
                    background: isSelected ? '#e0f2fe' : '#ffffff',
                    color: isSelected ? '#0369a1' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: d.statusColor || '#10b981'
                  }}></span>
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctor Details Body */}
        <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Main Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #38B6FF 0%, #0284c7 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              boxShadow: '0 8px 16px rgba(56, 182, 255, 0.25)',
              flexShrink: 0
            }}>
              {doc.name ? doc.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() : 'D'}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {doc.name}
                </h2>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  backgroundColor: doc.isAvailable ? '#ecfdf5' : '#fef2f2',
                  color: doc.isAvailable ? '#065f46' : '#991b1b',
                  border: `1px solid ${doc.isAvailable ? '#a7f3d0' : '#fecaca'}`
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: doc.statusColor
                  }}></span>
                  {doc.statusText}
                </span>
              </div>
              <p style={{ fontSize: '0.92rem', color: '#64748b', marginTop: '0.2rem', fontWeight: '500' }}>
                {doc.specialization || 'General Specialist'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.85rem',
              padding: '0.85rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Waiting
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0284c7', marginTop: '0.15rem' }}>
                {doc.queueStats?.waiting || 0}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.85rem',
              padding: '0.85rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Consult
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#059669', marginTop: '0.15rem' }}>
                {doc.queueStats?.called || 0}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.85rem',
              padding: '0.85rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Completed
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#475569', marginTop: '0.15rem' }}>
                {doc.queueStats?.done || 0}
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #ebdcc9',
            borderRadius: '0.85rem',
            overflow: 'hidden',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.88rem'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Today's Shift</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>
                {doc.isLeave ? (
                  <span style={{ color: '#ef4444' }}>Leave: {doc.leaveReason || 'Unavailable'}</span>
                ) : (
                  `${doc.startTime} – ${doc.endTime}`
                )}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.88rem'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Queue Mode</span>
              <span style={{ fontWeight: '600', color: '#0f172a', textTransform: 'capitalize' }}>
                {doc.mode || 'Walk-In'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.88rem'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Consultation Pace</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>
                ~{doc.timePerPatient} mins per patient
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              fontSize: '0.88rem'
            }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>Direct Phone</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  {doc.phone || 'No phone set'}
                </span>
                {doc.phone && (
                  <button
                    onClick={() => handleCopyPhone(doc.phone)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.4rem',
                      cursor: 'pointer',
                      color: copiedPhone ? '#059669' : '#475569'
                    }}
                  >
                    {copiedPhone ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                closeDoctorDetails();
                router.push('/dashboard/queue');
              }}
              style={{
                flex: 1,
                padding: '0.85rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(to right, #38B6FF, #0284c7)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(56, 182, 255, 0.25)',
                transition: 'opacity 0.15s ease'
              }}
            >
              <span>⚡ View in Live Queue</span>
            </button>

            <button
              onClick={() => {
                closeDoctorDetails();
                router.push('/dashboard/calendar');
              }}
              style={{
                flex: 1,
                padding: '0.85rem',
                borderRadius: '0.75rem',
                background: '#FCF4E7',
                color: '#7c2d12',
                border: '1px solid #ebdcc9',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'background-color 0.15s ease'
              }}
            >
              <span>📅 View Calendar</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
