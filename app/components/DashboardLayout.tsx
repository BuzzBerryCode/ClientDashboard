'use client'

import { supabase } from '@/lib/supabase'
import { BarChart3, ChevronLeft, ChevronRight, HelpCircle, LogOut, MessageSquare, RefreshCw, Users } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [clientBrand, setClientBrand] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = sessionStorage.getItem('isAuthenticated')
    const storedUsername = sessionStorage.getItem('username')
    
    if (!isAuthenticated || !storedUsername) {
      router.push('/login')
      return
    }

    // Check if we already have cached data
    const cachedBrand = sessionStorage.getItem('clientBrand')
    if (cachedBrand && storedUsername === sessionStorage.getItem('cachedUsername')) {
      setClientBrand(cachedBrand)
      setUsername(storedUsername)
      setLoading(false)
      setDataLoaded(true)
      return
    }

    setUsername(storedUsername)

    // Fetch client_brand from Supabase only if not cached
    const fetchClientBrand = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('client_brand')
          .eq('username', storedUsername)
          .single()

        if (error) {
          console.error('Error fetching client brand:', error)
        } else if (data) {
          const brand = data.client_brand || ''
          setClientBrand(brand)
          // Cache the data
          sessionStorage.setItem('clientBrand', brand)
          sessionStorage.setItem('cachedUsername', storedUsername)
        }
      } catch (err) {
        console.error('Error fetching client brand:', err)
      } finally {
        setLoading(false)
        setDataLoaded(true)
      }
    }

    fetchClientBrand()
  }, [router])

  // Generate initials from username
  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Navigation items
  const navItems = [
    { path: '/tracking', label: 'Tracking', icon: BarChart3 },
    { path: '/creators', label: 'Creators', icon: Users },
  ]

  const handleNavigation = (path: string) => {
    if (pathname === path) return // Don't navigate if already on the page
    
    setIsTransitioning(true)
    startTransition(() => {
      router.push(path)
    })
    // Reset transition state after a short delay
    setTimeout(() => {
      setIsTransitioning(false)
    }, 200)
  }

  // Reset transition state when pathname changes
  useEffect(() => {
    setIsTransitioning(false)
  }, [pathname])

  const handleSignOut = () => {
    // Clear all session data
    sessionStorage.removeItem('isAuthenticated')
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('email')
    sessionStorage.removeItem('clientBrand')
    sessionStorage.removeItem('cachedUsername')
    
    // Redirect to login
    router.push('/login')
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const sidebarWidth = sidebarCollapsed ? '80px' : '240px'
  const mainMarginLeft = sidebarCollapsed ? '80px' : '240px'
  const mainWidth = sidebarCollapsed ? 'calc(100vw - 80px)' : 'calc(100vw - 240px)'

  // Only show loading on initial mount when data is not loaded yet
  if (loading && !dataLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ color: '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f9fafb',
        overflowX: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%'
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: sidebarWidth,
            height: '100vh',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: sidebarCollapsed ? '24px 8px' : '24px 16px',
            position: 'fixed',
            left: 0,
            top: 0,
            transition: 'width 0.3s ease, padding 0.3s ease',
            zIndex: 100
          }}
        >
          {/* Brand Name Section */}
          <div
            style={{
              marginBottom: '24px',
              paddingBottom: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {!sidebarCollapsed && (
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#111827'
                }}
              >
                {clientBrand || 'Client Brand'}
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                marginLeft: sidebarCollapsed ? '0' : '8px'
              }}
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flex: 1
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              const isTracking = item.path === '/tracking'
              return (
                <div
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: active ? '#eef2ff' : 'transparent',
                    color: active ? '#4338ca' : '#4b5563',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      gap: sidebarCollapsed ? 0 : 8,
                      flex: 1
                    }}
                  >
                    <Icon size={18} style={{ marginRight: sidebarCollapsed ? '0' : '0' }} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {isTracking && !sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Notify tracking page to refresh its data
                        window.dispatchEvent(new CustomEvent('tracking-refresh'))
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        margin: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: '999px',
                        color: active ? '#4338ca' : '#9ca3af',
                        transition: 'background-color 0.15s ease, color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e5e7eb'
                        e.currentTarget.style.color = '#111827'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = active ? '#4338ca' : '#9ca3af'
                      }}
                      title="Refresh tracking data"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sidebar Footer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Help Links */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  color: '#4b5563',
                  fontSize: '14px',
                  cursor: 'pointer',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
                }}
              >
                <HelpCircle size={18} style={{ marginRight: sidebarCollapsed ? '0' : '8px' }} />
                {!sidebarCollapsed && <span>Help</span>}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  color: '#4b5563',
                  fontSize: '14px',
                  cursor: 'pointer',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
                }}
              >
                <MessageSquare size={18} style={{ marginRight: sidebarCollapsed ? '0' : '8px' }} />
                {!sidebarCollapsed && <span>Feedback</span>}
              </div>
            </div>

            {/* User Profile */}
            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: sidebarCollapsed ? 'column' : 'row',
                  gap: sidebarCollapsed ? '8px' : '12px',
                  marginBottom: sidebarCollapsed ? '12px' : '0'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#ddd6fe',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  {getInitials(username)}
                </div>
                {!sidebarCollapsed && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#111827'
                      }}
                    >
                      {username}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}
                    >
                      {clientBrand || 'Client'}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.color = '#dc2626'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#6b7280'
                  }}
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            padding: '32px',
            marginLeft: mainMarginLeft,
            width: mainWidth,
            backgroundColor: '#f9fafb',
            transition: 'margin-left 0.3s ease, opacity 0.15s ease, width 0.3s ease',
            overflowX: 'hidden'
          }}
        >
          <div
            style={{
              opacity: isTransitioning ? 0.7 : 1,
              transition: 'opacity 0.15s ease'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

