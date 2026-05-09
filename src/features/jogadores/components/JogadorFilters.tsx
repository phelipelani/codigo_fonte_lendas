// Arquivo: src/features/jogadores/components/JogadorFilters.tsx
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type JogadorFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  positionFilter: 'all' | 'linha' | 'goleiro';
  onPositionChange: (value: 'all' | 'linha' | 'goleiro') => void;
  sortBy: 'nome' | 'nivel' | 'posicao';
  onSortChange: (value: 'nome' | 'nivel' | 'posicao') => void;
  onClearFilters: () => void;
};

export const JogadorFilters = ({
  searchTerm,
  onSearchChange,
  positionFilter,
  onPositionChange,
  sortBy,
  onSortChange,
  onClearFilters,
}: JogadorFiltersProps) => {
  const hasActiveFilters = searchTerm !== '' || positionFilter !== 'all' || sortBy !== 'nome';

  return (
    <div className="glass-strong rounded-lg p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtro de Posição */}
        <Select value={positionFilter} onValueChange={onPositionChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Posição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Posições</SelectItem>
            <SelectItem value="linha">Linha</SelectItem>
            <SelectItem value="goleiro">Goleiro</SelectItem>
          </SelectContent>
        </Select>

        {/* Ordenação */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome (A-Z)</SelectItem>
            <SelectItem value="nivel">Nível (Maior)</SelectItem>
            <SelectItem value="posicao">Posição</SelectItem>
          </SelectContent>
        </Select>

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-textMuted hover:text-textPrimary"
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
};