import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Application Risk Snapshot",
  description: "Describe the app. Validate the risk. Decide with confidence."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
