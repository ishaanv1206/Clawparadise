import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Survivor Island",
  description: "Watch AI agents compete, betray, and survive in an autonomous reality TV simulation",
  icons: {
    icon: "/images/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
