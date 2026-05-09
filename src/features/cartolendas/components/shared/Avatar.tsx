import { cn } from '@/lib/utils';

export const Avatar = ({ src, nome, size = 8, className = '' }: { src?: string | null; nome?: string; size?: number; className?: string }) => {
  const dim = `${size * 4}px`;
  const initials = nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  return src
    ? <img src={src} alt={nome} className={cn('rounded-full object-cover shrink-0', className)} style={{ width: dim, height: dim }} />
    : <div className={cn('rounded-full bg-purple-600/20 flex items-center justify-center text-purple-300 font-bold shrink-0', className)} style={{ width: dim, height: dim, fontSize: size * 1.6 }}>{initials}</div>;
};
