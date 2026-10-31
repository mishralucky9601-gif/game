import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Chaos Chess",
  description: "Chess meets Uno, dice, and chaos — real-time online multiplayer.",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/icon.svg" }],
};

export const viewport: Viewport = {
  themeColor: "#0a0a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-chaos-gradient text-white antialiased">
        {children}
      </body>
    </html>
  );
}
