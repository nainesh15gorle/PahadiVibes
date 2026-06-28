import type { Metadata } from "next";
import { AuthProvider } from '@/context/AuthContext';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Pahadi Vibes | Premium Handcrafted Goods",
  description: "Discover unique handmade treasures created by skilled artisans from across India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen flex flex-col overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <ToastProvider>
            <SplashScreen />
            <Navbar />
            {children}
            <Footer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
    </AuthProvider>
  );
}
