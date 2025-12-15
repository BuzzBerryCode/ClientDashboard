'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to tracking page as the default page
    router.replace('/tracking')
  }, [router])

  return null
}
