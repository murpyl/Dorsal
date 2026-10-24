import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "ClassPulse",
  description: "Live classroom confusion radar",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
