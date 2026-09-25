import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMNICARE — Hospital Management System",
  description: "Enterprise hospital operations: patients, scheduling, records, billing, pharmacy, and labs in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
