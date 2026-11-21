import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppInit } from "@/components/AppInit";
import { Nav } from "@/components/Nav";
import { Toasts } from "@/components/ui";
import { AudioBanner } from "@/components/AudioBanner";

export const metadata: Metadata = {
  title: "KeyFlow — Play, learn and master the piano",
  description: "An interactive piano game: free play, falling-note song lessons, rhythm challenges and practice exercises.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070912",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppInit />
        <Nav />
        {children}
        <AudioBanner />
        <Toasts />
      </body>
    </html>
  );
}
