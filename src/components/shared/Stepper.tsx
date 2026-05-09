// Arquivo: src/components/shared/Stepper.tsx
import * as React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Step = {
  id: number;
  label: string;
  description?: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number;
  className?: string;
};

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className }) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar Container */}
      <div className="relative mb-10 sm:mb-12">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-surfaceElevated border border-borderLight overflow-hidden">
          {/* Animated Progress */}
          <div
            className="h-full bg-gradient-to-r from-accentPrimary via-accentSecondary to-accentPrimary bg-[length:200%_100%] animate-gradient-x transition-all duration-700 ease-out shadow-lg"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isPending = stepNumber > currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                {/* Circle Container */}
                <div className="relative mb-3">
                  {/* Glow Effect */}
                  {(isCompleted || isCurrent) && (
                    <div 
                      className={cn(
                        "absolute inset-0 rounded-full blur-xl transition-all duration-500",
                        isCompleted && "bg-green-500/40 animate-pulse",
                        isCurrent && "bg-accentPrimary/50 animate-pulse"
                      )}
                    />
                  )}

                  {/* Circle */}
                  <div
                    className={cn(
                      'relative z-10 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-4 transition-all duration-500 shadow-2xl',
                      {
                        'border-green-500 bg-gradient-to-br from-green-500 to-green-600 text-white scale-110': isCompleted,
                        'border-accentPrimary bg-gradient-to-br from-accentPrimary to-accentSecondary text-white shadow-accentPrimary/50 scale-125 animate-pulse-subtle': isCurrent,
                        'border-borderLight bg-surface text-textMuted scale-90': isPending,
                      }
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6 sm:h-7 sm:w-7 font-bold" strokeWidth={3} />
                    ) : isPending ? (
                      <Circle className="h-5 w-5 sm:h-6 sm:w-6 opacity-30" />
                    ) : (
                      <span className="text-base sm:text-lg font-bold">{stepNumber}</span>
                    )}
                  </div>

                  {/* Ripple Effect for Current */}
                  {isCurrent && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-accentPrimary animate-ping opacity-20" />
                      <div className="absolute inset-0 rounded-full border border-accentPrimary animate-ping opacity-10" style={{ animationDelay: '0.5s' }} />
                    </>
                  )}
                </div>

                {/* Label Container */}
                <div className="text-center max-w-[100px] sm:max-w-[140px]">
                  <div
                    className={cn(
                      'text-xs sm:text-sm font-bold mb-1 transition-all duration-300',
                      {
                        'text-green-500': isCompleted,
                        'text-accentPrimary scale-110': isCurrent,
                        'text-textMuted': isPending,
                      }
                    )}
                  >
                    {step.label}
                  </div>
                  
                  {step.description && (
                    <div 
                      className={cn(
                        "text-[10px] sm:text-xs leading-tight transition-all duration-300",
                        {
                          'text-green-400/80': isCompleted,
                          'text-accentPrimary/80 font-medium': isCurrent,
                          'text-textMuted/60': isPending,
                        }
                      )}
                    >
                      {step.description}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={cn(
                    "mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                    {
                      'bg-green-500/20 text-green-400 border border-green-500/30': isCompleted,
                      'bg-accentPrimary/20 text-accentPrimary border border-accentPrimary/30 animate-pulse-subtle': isCurrent,
                      'bg-surface text-textMuted border border-borderLight': isPending,
                    }
                  )}>
                    {isCompleted && '✓ Concluído'}
                    {isCurrent && '● Em Andamento'}
                    {isPending && '○ Pendente'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1.25); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};