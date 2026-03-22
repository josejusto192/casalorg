import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
