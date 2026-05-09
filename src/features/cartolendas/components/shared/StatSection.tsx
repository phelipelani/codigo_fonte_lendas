import React from 'react';

export function StatSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2">
        <Icon size={14} className="text-purple-400" />
        <h3 className="font-black text-white text-xs uppercase tracking-wide">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}
