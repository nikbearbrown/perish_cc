import type { ReactNode } from 'react'
import DashboardNav from './DashboardNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="container px-4 md:px-6 mx-auto pt-6">
        <div className="max-w-2xl mx-auto">
          <DashboardNav />
        </div>
      </div>
      {children}
    </div>
  )
}
