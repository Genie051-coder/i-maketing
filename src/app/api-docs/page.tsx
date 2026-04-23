'use client'

import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { useEffect } from 'react'

export default function ApiDocsPage() {
  useEffect(() => {
    const original = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('UNSAFE_componentWillReceiveProps'))
        return
      original(...args)
    }
    return () => {
      console.error = original
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI url="/api/docs" />
    </div>
  )
}
