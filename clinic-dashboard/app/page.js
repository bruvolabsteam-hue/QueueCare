/* eslint-disable */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

import { createClient } from '../utils/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const supabase = createClient();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) setError(signUpError.message);
      else setError('Check your email for the confirmation link!');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) setError(signInError.message);
      else router.push('/dashboard');
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
        <p className={styles.subtitle}>Sign in to your Clinic Dashboard</p>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleAuth}>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <input 
                type="email" 
                className={styles.input} 
                placeholder="admin@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          <button type="submit" className={styles.submitBtn}>
            {isSignUp ? 'Sign Up' : 'Sign in to Dashboard'}
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{marginTop: '1rem', background: 'transparent', color: '#6366f1', border: 'none', cursor: 'pointer', width: '100%'}}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>

        </form>
      </div>
    </div>
  );
}
