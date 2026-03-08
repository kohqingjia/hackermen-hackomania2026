import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import NavBar from "@/components/shared/NavBar";
import ChatWidget from "@/components/shared/ChatWidget";

export const metadata: Metadata = {
  title: "BlockBattles",
  description: "Community Energy Challenge — SP Group Hackomania 2025",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-sp-bg min-h-screen">
        <main className="max-w-md mx-auto pb-20 min-h-screen">
          {children}
        </main>
        <NavBar />
        <ChatWidget />
      </body>
    </html>
  );
}
