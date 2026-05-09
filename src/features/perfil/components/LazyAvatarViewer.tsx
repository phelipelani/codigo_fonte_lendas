// Arquivo: src/features/perfil/components/LazyAvatarViewer.tsx
// Wrapper que carrega o AvatarViewer (Three.js) sob demanda via React.lazy
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

const AvatarViewer = React.lazy(() => import("./AvatarViewer"));

const AvatarFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-white/5">
    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
  </div>
);

export default function LazyAvatarViewer(props: {
  url: string | null;
  showBall?: boolean;
  className?: string;
}) {
  return (
    <Suspense fallback={<AvatarFallback />}>
      <AvatarViewer {...props} />
    </Suspense>
  );
}
