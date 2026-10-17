import { Suspense, type ReactNode } from "react";
import { PortalFrame } from "@/components/portal-frame";
import { LoadingScreen } from "@/components/ui";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PortalFrame>{children}</PortalFrame>
    </Suspense>
  );
}
