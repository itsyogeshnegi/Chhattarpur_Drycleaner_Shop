import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: "AL-HARAM Drycleaner's And Launderettes | Premium Dry Cleaning in Chattarpur, New Delhi",
  description:
    "Expert dry cleaning, steam ironing, curtain cleaning, and laundry services in Chattarpur, New Delhi. Free doorstep pickup & fast delivery. Best fabric care guaranteed.",
  keywords: [
    "Dry Cleaner Chattarpur",
    "Al Haram Dry Cleaners",
    "Laundry Service South Delhi",
    "Steam Pressing Chattarpur",
    "Suit Dry Clean Delhi",
    "Saree Dry Clean",
    "Doorstep Laundry Pickup",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
