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
  const [showPassword, setShowPassword] = useState(false);
  
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

        <h1 className={styles.title}>BruvoLabs Clinic</h1>
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
                type={showPassword ? "text" : "password"} 
                className={styles.input} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '20px', height: '20px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '20px', height: '20px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
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
