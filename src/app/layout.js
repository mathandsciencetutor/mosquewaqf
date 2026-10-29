import { Hind_Siliguri } from "next/font/google";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
});

export const metadata = {
  title: "Abdul Hakim Waqf Estate Management",
  description: "Mosque-Waqf Donor Management Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body
        className={`${hindSiliguri.className} min-h-screen antialiased bg-slate-50 text-slate-900`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}