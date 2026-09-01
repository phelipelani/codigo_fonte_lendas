import { memo } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import PageTitle from '@/components/shared/PageTitle';
import icCampeonatos from '@/assets/icones/campeonatos.webp';

interface Props { isAdmin: boolean; }
export const ChampionshipsHeader = memo(({ isAdmin }: Props) => (
  <header className="mb-6 md:mb-8">
    <PageTitle
      icon={icCampeonatos}
      title="Campeonatos"
      subtitle="Gerencie competições, times e resultados"
    >
      {isAdmin && (
        <Link to="/campeonatos/novo">
          <Button className="h-10 md:h-11 px-4 md:px-5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25">
            <Plus size={18} className="mr-1.5 md:mr-2" />
            <span className="hidden md:inline">Novo Campeonato</span>
            <span className="md:hidden">Novo</span>
          </Button>
        </Link>
      )}
    </PageTitle>
  </header>
));
