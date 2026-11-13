'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  ShoppingBag,
  ListOrdered,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';

function AdminNavItems({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  const navLinks = [
    {
      name: 'Counter POS',
      shortName: 'POS',
      href: '/admin/counter',
      icon: ShoppingBag,
      desc: 'New orders & billing',
      isActive: pathname.startsWith('/admin/counter'),
    },
    {
      name: 'Orders & Deliveries',
      shortName: 'Orders',
      href: '/admin/orders',
      icon: ListOrdered,
      desc: 'Track clothes & SMS alerts',
      isActive: pathname.startsWith('/admin/orders') || pathname.startsWith('/admin/invoices'),
    },
    {
      name: 'Customers List',
      shortName: 'Customers',
      href: '/admin/customers',
      icon: Users,
      desc: 'Profiles & quick actions',
      isActive: pathname.startsWith('/admin/customers'),
    },
    {
      name: 'Customer Reviews',
      shortName: 'Reviews',
      href: '/admin/reviews',
      icon: Star,
      desc: 'Approve, edit & add reviews',
      isActive: pathname.startsWith('/admin/reviews'),
    },
    {
      name: 'Customisation Hub',
      shortName: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      desc: 'Pricing & store settings',
      isActive: pathname.startsWith('/admin/settings'),
    },
  ];

  return (
    <nav className="p-2 sm:p-2.5 space-y-1 grow">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const active = link.isActive;

        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
            title={link.name}
            className={`group relative flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2 text-xs'
                : 'gap-2.5 px-3 py-2 text-xs'
            } ${
              active
                ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-950/40'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white font-medium'
            }`}
          >
            <Icon
              className={`shrink-0 transition-transform ${
                isCollapsed ? 'w-4 h-4' : 'w-4 h-4'
              } ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
            />

            {!isCollapsed ? (
              <div className="truncate">
                <span className="block text-xs leading-tight">{link.name}</span>
                <span className="text-[10px] opacity-70 block truncate leading-tight mt-0.5">
                  {link.desc}
                </span>
              </div>
            ) : (
              <span className="sr-only">{link.name}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

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
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Hard navigation to /admin/login cleanly clears all in-memory client state and cookies
      window.location.href = '/admin/login';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-950 text-white p-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-black">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold text-xs tracking-tight text-white block">AL-HARAM CMS</span>
            <span className="text-[9px] text-brand-300 uppercase tracking-widest font-semibold block">Counter & Orders</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Mobile Menu"
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
          sidebarOpen ? 'translate-x-0 w-64 left-0' : '-translate-x-full md:translate-x-0'
        } ${
          // Desktop state: collapsed (w-16) vs open (w-60)
          isCollapsed ? 'md:w-[68px]' : 'md:w-60'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Brand header */}
          <div
            className={`border-b border-slate-800/80 transition-all duration-300 ${
              isCollapsed ? 'p-2.5 flex flex-col items-center' : 'p-3.5 sm:p-4'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1.5' : 'justify-between'}`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 shrink-0 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black shadow-md shadow-brand-950">
                  <Sparkles className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <span className="font-extrabold text-xs tracking-tight text-white block">
                      AL-HARAM
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold block">
                      Back-Office CMS
                    </span>
                  </div>
                )}
              </div>

              {/* Desktop Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition items-center justify-center"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                )}
              </button>

              {/* Mobile Drawer Close Button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Links wrapped in Suspense for searchParams */}
          <Suspense fallback={<div className="p-3 text-xs text-slate-500">Loading nav...</div>}>
            <AdminNavItems isCollapsed={isCollapsed} onNavigate={() => setSidebarOpen(false)} />
          </Suspense>

          {/* Footer actions */}
          <div className="p-2 sm:p-2.5 border-t border-slate-800/80 space-y-1 mt-auto">
            <Link
              href="/"
              target="_blank"
              title="Open Live Website"
              className={`flex items-center text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition ${
                isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-1.5'
              }`}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span className="text-[11px] font-medium">Live Website</span>}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className={`w-full flex items-center text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition ${
                isCollapsed ? 'justify-center p-2' : 'gap-2 px-3 py-1.5'
              }`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!isCollapsed && <span className="text-[11px]">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="grow min-w-0 p-3 sm:p-4 lg:p-5 overflow-x-hidden transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
