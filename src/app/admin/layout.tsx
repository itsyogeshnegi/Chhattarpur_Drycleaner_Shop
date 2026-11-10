'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  ShoppingBag,
  ListOrdered,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse state (default: false = OPEN)

  // If on login page, render children without sidebar shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
    }
  };

  const navLinks = [
    {
      name: 'Counter POS',
      shortName: 'POS',
      href: '/admin/counter',
      icon: ShoppingBag,
      desc: 'New orders & transactions',
    },
    {
      name: 'Orders & Deliveries',
      shortName: 'Orders',
      href: '/admin/orders',
      icon: ListOrdered,
      desc: 'Track stages & send SMS',
    },
    {
      name: 'Dual Invoices',
      shortName: 'Invoices',
      href: '/admin/orders?view=invoices',
      icon: FileSpreadsheet,
      desc: 'Customer & Internal bills',
    },
    {
      name: 'Customisation Hub',
      shortName: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      desc: 'Pricing & store settings',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-950 text-white p-3.5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-black">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white block">AL-HARAM CMS</span>
            <span className="text-[9px] text-brand-300 uppercase tracking-widest font-semibold block">Counter & Orders</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Mobile Menu"
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 h-screen bg-slate-950 text-white border-r border-slate-800 shrink-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          // Mobile state: slide in drawer
          sidebarOpen ? 'translate-x-0 w-72 left-0' : '-translate-x-full md:translate-x-0'
        } ${
          // Desktop state: collapsed (w-20) vs open (w-64)
          isCollapsed ? 'md:w-[72px]' : 'md:w-64'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Brand header */}
          <div className={`border-b border-slate-800/80 transition-all duration-300 ${isCollapsed ? 'p-3 flex flex-col items-center' : 'p-4 sm:p-5'}`}>
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black shadow-md shadow-brand-950">
                  <Sparkles className="w-5 h-5" />
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <span className="font-extrabold text-sm tracking-tight text-white block">
                      AL-HARAM
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
                      Back-Office CMS
                    </span>
                  </div>
                )}
              </div>

              {/* Desktop Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand sidebar (Ctrl + B)' : 'Collapse sidebar'}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition items-center justify-center"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-brand-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-400 hover:text-white" />
                )}
              </button>

              {/* Mobile Drawer Close Button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick status indicator when collapsed */}
            {isCollapsed && (
              <span className="text-[8px] font-bold text-brand-400 uppercase tracking-wider mt-1 text-center hidden md:block">
                CMS
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-2 sm:p-3 space-y-1.5 grow">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href.split('?')[0]);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  title={link.name}
                  className={`group relative flex items-center rounded-xl transition font-semibold ${
                    isCollapsed
                      ? 'justify-center p-2.5 text-xs'
                      : 'gap-3 px-3.5 py-2.5 text-xs'
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-950/40'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className={`shrink-0 transition-transform ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  
                  {!isCollapsed ? (
                    <div className="truncate">
                      <span className="block text-xs font-bold">{link.name}</span>
                      <span className="text-[10px] font-normal opacity-70 block truncate">{link.desc}</span>
                    </div>
                  ) : (
                    // Tooltip on hover when collapsed
                    <span className="sr-only">{link.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer actions */}
          <div className="p-2.5 sm:p-3 border-t border-slate-800/80 space-y-1.5 mt-auto">
            <Link
              href="/"
              target="_blank"
              title="Open Live Website"
              className={`flex items-center text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
              }`}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Live Website</span>}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className={`w-full flex items-center text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="grow min-w-0 p-3.5 sm:p-5 lg:p-7 overflow-x-hidden transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
