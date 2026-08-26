import React from 'react';
import { OpcaoBet } from '../api/bets';

interface OddButtonProps {
  opcao: OpcaoBet;
  isSelected: boolean;
  onToggle: (opcao: OpcaoBet) => void;
}

export function OddButton({ opcao, isSelected, onToggle }: OddButtonProps) {
  return (
    <button
      onClick={() => onToggle(opcao)}
      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 shadow-sm
        ${
          isSelected
            ? 'bg-fut-primary text-black border-fut-primary scale-105'
            : 'bg-zinc-800 text-white border-transparent hover:border-fut-primary hover:bg-zinc-700'
        }
      `}
    >
      <span className="text-sm font-medium mb-1 truncate w-full text-center">{opcao.descricao}</span>
      <span className="text-lg font-bold">
        {Number(opcao.odd).toFixed(2)}
      </span>
    </button>
  );
}
