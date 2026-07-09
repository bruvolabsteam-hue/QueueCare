/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

import { createClient } from '../utils/supabase/client';

export default function Login() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlError = searchParams.get('error');
      if (urlError) {
        setError(`Authentication Failed: ${decodeURIComponent(urlError)}`);
      }
    }
  }, []);

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-');        // Replace multiple - with single -
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const clinicSlug = slugify(clinicName);
    if (!clinicSlug) {
      setError('Please enter a valid clinic name.');
      setLoading(false);
      return;
    }

    const email = `${clinicSlug}@queuecare.com`;

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Admin',
            clinic_name: clinicName,
            clinic_slug: clinicSlug
          }
        }
      });
      
      if (signUpError) {
        console.error('Sign Up Error:', signUpError);
        setError(
          signUpError.message === '{}' || !signUpError.message 
            ? `Error: ${JSON.stringify(signUpError)}` 
            : signUpError.message
        );
        setLoading(false);
      } else if (data?.session) {
        router.push('/dashboard');
      } else {
        // Automatically try to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
        } else {
          router.push('/dashboard');
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        
        <div className={styles.logoContainer}>
          <svg className={styles.logoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>

        <h1 className={styles.title}>OmniCare Clinic</h1>
        <p className={styles.subtitle}>
          {isSignUp ? 'Create your Clinic Workspace' : 'Sign in to your Clinic Dashboard'}
        </p>

        {error && (
          <div className={styles.errorBox}>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}

        <form className={styles.form} onSubmit={handleAuth}>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Clinic Name</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="e.g. Apollo Dental Care"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
            </div>
          </div>

          

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <input 
                type="password" 
                className={styles.input} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Workspace' : 'Sign in to Dashboard')}
          </button>
          
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={{marginTop: '1rem', background: 'transparent', color: '#6366f1', border: 'none', cursor: 'pointer', width: '100%'}}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need a new clinic account? Sign Up'}
          </button>

        </form>
      </div>
    </div>
  );
}
