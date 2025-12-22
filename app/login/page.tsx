'use client'

export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import { Lock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Query Supabase table 'users' for matching username and password
      // Table schema: id, username, password, email, created_at, updated_at
      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle()

      if (queryError) {
        throw queryError
      }

      if (data) {
        // User found and credentials match
        if (rememberMe) {
          localStorage.setItem('username', username)
        }
        // Store session
        sessionStorage.setItem('isAuthenticated', 'true')
        sessionStorage.setItem('username', username)
        if (data.email) {
          sessionStorage.setItem('email', data.email)
        }
        
        // Redirect to tracking page (default page after login)
        router.push('/tracking')
      } else {
        setError('Invalid username or password')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      // Handle Supabase specific errors
      if (err.code === 'PGRST116') {
        // No rows returned
        setError('Invalid username or password')
      } else {
        setError(err.message || 'An error occurred during login. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        fontFamily: 'Inter, Arial, sans-serif'
      }}
    >
      {/* Left Image Panel */}
      <div
        style={{
          flex: '1.6',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <img
          src="/DashImage.jpeg"
          alt="Haven Influence Dashboard"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '70% center'
          }}
        />
      </div>

      {/* Right Login Panel */}
      <div
        style={{
          flex: '1',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0'
          }}
        >
          {/* Logo and Title Section */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginBottom: '32px'
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                alignSelf: 'center',
                width: '100%'
              }}
            >
              <img
                src="/haven-influence-logo.png"
                alt="Haven Influence Logo"
                style={{
                  height: '48px',
                  width: 'auto'
                  
                }}
              />
            </div>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '16px',
                color: '#4a4a4a',
                lineHeight: '1.5',
                margin: '0'
              }}
            >
              Please login to continue
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            {/* Username Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Enter Your Username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
              <Mail
                size={20}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  width: '20px',
                  height: '20px'
                }}
              />
            </div>

            {/* Password Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="password"
                placeholder="Enter Your Password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  width: '20px',
                  height: '20px'
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '14px'
                }}
              >
                {error}
              </div>
            )}

            {/* Remember Me Checkbox */}
            <label
              style={{
                alignSelf: 'flex-start',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                paddingLeft: '2px'
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  marginRight: '8px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              />
              <span
                style={{
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                Remember Me
              </span>
            </label>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#93c5fd' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease-in-out'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6'
                }
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Forgot Credentials */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              marginTop: '8px'
            }}
          >
            <span
              style={{
                display: 'inline',
                fontSize: '14px',
                color: '#6b7280'
              }}
            >
              Forgot your credentials? {' '}
            </span>
            <a
              href="mailto:info@haveninfluence.com"
              style={{
                display: 'inline',
                fontSize: '14px',
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

