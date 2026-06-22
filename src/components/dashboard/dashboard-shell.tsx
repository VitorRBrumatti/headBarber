'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sidebar } from './sidebar'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail: string
  barbershopName: string
}

export function DashboardShell({ children, userEmail, barbershopName }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  // Get user initials for profile fallback
  const getInitials = (email: string) => {
    if (!email) return 'HB'
    const name = email.split('@')[0]
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#181c21] flex relative">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-[260px] z-50">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-[260px] min-h-screen flex flex-col transition-all duration-300">
        {/* Top Navigation */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-[#eceef4] sticky top-0 z-45 shadow-sm">
          {/* Mobile Menu Button & Brand Symbol */}
          <div className="flex items-center gap-4 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-[#181c21] hover:text-[#C79A4A] transition-colors p-1"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5 hover:opacity-90">
              <img 
                src="/brand/logo-symbol-gold.png" 
                alt="HeadBarber Symbol" 
                className="h-6 w-auto object-contain"
              />
              <span className="font-montserrat font-extrabold tracking-tight text-black text-sm">HeadBarber</span>
            </Link>
          </div>

          {/* Search Bar (Hidden or smaller on mobile) */}
          <div className="hidden sm:flex items-center gap-3 bg-[#f1f3fa] px-4 py-1.5 rounded-full w-full max-w-xs md:max-w-md">
            <span className="material-symbols-outlined text-[#77767b] text-lg">search</span>
            <input 
              className="bg-transparent border-none outline-none focus:ring-0 w-full text-xs font-medium placeholder:text-[#858387] text-[#181c21]" 
              placeholder="Buscar reservas, clientes..." 
              type="text"
            />
          </div>

          {/* Actions & Profile */}
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <button className="relative text-[#47464b] hover:text-[#C79A4A] transition-all p-1 cursor-pointer">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#ba1a1a] rounded-full"></span>
            </button>
            
            <button className="text-[#47464b] hover:text-[#C79A4A] transition-all p-1 cursor-pointer hidden sm:block">
              <span className="material-symbols-outlined text-xl">help_outline</span>
            </button>

            <div className="h-6 w-px bg-[#c8c5cb] mx-1 hidden sm:block"></div>

            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <div 
                className="flex items-center gap-3 cursor-pointer group select-none"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="text-right hidden md:block">
                  <p className="font-semibold text-xs text-[#181c21] leading-none group-hover:text-[#C79A4A] transition-colors">{userEmail.split('@')[0]}</p>
                  <p className="text-[9px] uppercase text-[#47464b] tracking-wider font-semibold mt-0.5">{barbershopName}</p>
                </div>
                <div className="w-9 h-9 rounded-full border border-[#C79A4A] p-0.5 overflow-hidden flex items-center justify-center bg-[#1b1b1e] text-[#C79A4A] text-xs font-bold font-mono">
                  {getInitials(userEmail)}
                </div>
              </div>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-45"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#eceef4] rounded-xl shadow-xl z-50 py-2 animate-fade-in-down">
                    <div className="px-4 py-2 border-b border-[#eceef4] md:hidden">
                      <p className="font-semibold text-xs text-[#181c21] truncate">{userEmail}</p>
                      <p className="text-[9px] uppercase text-[#47464b] tracking-wider font-semibold mt-0.5 truncate">{barbershopName}</p>
                    </div>
                    <form action="/auth/signout" method="post" className="w-full">
                      <button 
                        type="submit" 
                        className="w-full text-left px-4 py-2 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/20 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">logout</span>
                        Sair do Painel
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sliding Aside */}
          <aside className="fixed inset-y-0 left-0 w-[260px] h-full z-55 transform transition-transform duration-350 ease-in-out md:hidden translate-x-0">
            <Sidebar onLinkClick={() => setMobileMenuOpen(false)} />
          </aside>
        </>
      )}
    </div>
  )
}
