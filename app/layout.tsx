import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalProvider } from "@/components/portal-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Talk To Us — Ideas, made visible",
    template: "%s · Talk To Us",
  },
  description: "A thoughtful place to share ideas and see what happens next.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PortalProvider>{children}</PortalProvider>
      </body>
    </html>
  );
}
