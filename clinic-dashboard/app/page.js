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

          <a 
            href="https://wa.me/YOUR_PHONE_NUMBER?text=Hello%2C%20I%20need%20help%20with%20my%20OmniCare%20Clinic%20account."
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappBtn}
          >
            <svg className={styles.whatsappIcon} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Need Help? Contact Support
          </a>

        </form>
      </div>
    </div>
  );
}
