/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ClinicProvider, useClinic } from '../context/ClinicContext';
import DoctorDetailsModal from './components/DoctorDetailsModal';
import styles from './dashboard.module.css';

function DashboardLayoutInner({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { doctors, openDoctorDetails, clinic } = useClinic();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else if (clinic?.clinic_name) {
          setUserName(clinic.clinic_name);
        }
      }
    }
    getUser();
  }, [supabase, clinic]);

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <div className={styles.logoIconContainer}>
            <svg className={styles.logoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoBruvo}>Bruvo</span>
            <span className={styles.logoFlow}>Flow</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Overview
          </Link>
          <Link href="/dashboard/setup" className={`${styles.navItem} ${pathname.includes('/setup') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Daily Setup
          </Link>
          <Link href="/dashboard/calendar" className={`${styles.navItem} ${pathname.includes('/calendar') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Calendar
          </Link>
          <Link href="/dashboard/queue" className={`${styles.navItem} ${pathname.includes('/queue') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Live Queue
          </Link>
          <Link href="/dashboard/patients" className={`${styles.navItem} ${pathname.includes('/patients') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Patients
          </Link>
          <Link href="/dashboard/summary" className={`${styles.navItem} ${pathname.includes('/summary') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Daily Summary
          </Link>
          <Link href="/dashboard/staff" className={`${styles.navItem} ${pathname.includes('/staff') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Doctors & Staff
          </Link>
          <Link href="/dashboard/settings" className={`${styles.navItem} ${pathname.includes('/settings') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </Link>
          <Link href="/dashboard/support" className={`${styles.navItem} ${pathname.includes('/support') ? styles.active : ''}`}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            Help & Support
          </Link>
        </nav>
        
        <div className={styles.bottomNav}>
          <div style={{padding: '0.5rem 1rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {userEmail}
          </div>
          <a href="#" className={styles.navItem} onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>
            <span className={styles.logoBruvo}>Bruvo</span>
            <span className={styles.logoFlow}>Flow</span>
            <span className={styles.headerSubtitle}>Clinic Dashboard</span>
          </h2>
          <div className={styles.headerActions}>
            {/* Interactive Doctors Roster in Header */}
            <div className={styles.doctorsHeaderBar}>
              <div
                className={styles.doctorsLabel}
                onClick={() => {
                  if (doctors.length > 0) openDoctorDetails(doctors[0]);
                }}
                style={{ cursor: 'pointer' }}
                title="View clinic doctors roster"
              >
                <span className={styles.stethoscopeIcon}>🩺</span>
                <span className={styles.doctorsHeaderTitle}>Doctors</span>
                <span className={styles.doctorsBadge}>{doctors.length}</span>
              </div>

              <div className={styles.doctorPillsContainer}>
                {doctors.length === 0 ? (
                  <span className={styles.noDoctorsHint}>No active doctors</span>
                ) : (
                  doctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className={styles.doctorPillBtn}
                      onClick={() => openDoctorDetails(doc)}
                      title={`Click to view ${doc.name}'s details, queue & schedule`}
                    >
                      <span
                        className={styles.doctorStatusDot}
                        style={{ backgroundColor: doc.statusColor || '#10b981' }}
                      />
                      <span className={styles.doctorPillName}>{doc.name}</span>
                      {doc.isLeave && <span className={styles.pillLeaveTag}>Leave</span>}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Admin Avatar Profile - click opens doctor roster */}
            <div
              className={styles.userProfile}
              onClick={() => {
                if (doctors.length > 0) {
                  openDoctorDetails(doctors[0]);
                }
              }}
              title="Click to view all clinic doctors and details"
            >
              <div className={styles.avatar}>
                {userName ? userName.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={styles.userName}>{userName}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1 }}>Clinic Admin</span>
              </div>
            </div>
          </div>
        </header>
        
        <div className={styles.content}>
          {children}
        </div>

        {/* Universal Doctor Details Modal */}
        <DoctorDetailsModal />
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <ClinicProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ClinicProvider>
  );
}
