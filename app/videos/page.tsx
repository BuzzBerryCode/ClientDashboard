'use client'

import DashboardLayout from '@/app/components/DashboardLayout'

export default function VideosPage() {
  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', margin: 0 }}>
          Videos
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginBottom: '24px' }}>
          Manage and view your video content library
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
          Videos content will go here.
        </div>
      </div>
    </DashboardLayout>
  )
}

