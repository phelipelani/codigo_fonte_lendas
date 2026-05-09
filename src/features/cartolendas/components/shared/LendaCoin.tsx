import { cn } from '@/lib/utils';
import lendaCoinIcon from '@/assets/icones/lenda_coin.webp';

export const LendaCoin = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <img src={lendaCoinIcon} alt="LC" className={cn('inline-block shrink-0', className)} style={{ width: size, height: size }} />
);
