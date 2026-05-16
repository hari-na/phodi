import type { Metadata } from "next";
import "./globals.css";
import { OnboardingGate } from "@/components/OnboardingGate";

export const metadata: Metadata = {
  title: "Phodi — Indian languages, broken down",
  description:
    "Conversational Kannada (and more) for people who already speak an Indian language. AI-built lessons with Dravidian-aware pedagogy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-cream antialiased">
        <OnboardingGate>{children}</OnboardingGate>
      </body>
    </html>
  );
}
