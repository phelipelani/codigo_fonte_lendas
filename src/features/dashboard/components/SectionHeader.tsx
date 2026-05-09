// Arquivo: src/features/dashboard/components/SectionHeader.tsx
import React from "react";

interface SectionHeaderProps {
  icon: any;
  label: string;
  iconClass?: string;
}

const SectionHeader = React.memo(function SectionHeader({
  icon: Icon,
  label,
  iconClass = "text-white/30",
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={10} className={iconClass} />
      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/30">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.07] to-transparent" />
    </div>
  );
});

export default SectionHeader;
