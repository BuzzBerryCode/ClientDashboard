'use client'

import DashboardLayout from '@/app/components/DashboardLayout'

export default function TrackingPage() {
  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', margin: 0 }}>
          Tracking
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginBottom: '24px' }}>
          Track and monitor your social media campaigns and analytics
        </p>
        <div
          style={{
            width: '100%',
            minHeight: '600px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            color: '#9ca3af'
          }}
        >
          Tracking content will go here.
        </div>
      </div>
    </DashboardLayout>
  )
}

