'use client';

import React from 'react';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import CustomerAuthModal from '@/components/CustomerAuthModal';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider>
      {children}
      <CustomerAuthModal />
    </CustomerAuthProvider>
  );
}

