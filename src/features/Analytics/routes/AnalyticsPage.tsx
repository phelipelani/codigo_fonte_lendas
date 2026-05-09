// Arquivo: src/features/Analytics/routes/AnalyticsPage.tsx
import { useState, useCallback, useMemo } from "react";
import {
  BarChart3,
  User,
  Shield,
  Heart,
  Swords,
} from "lucide-react";
import icEstatisticas from '@/assets/icones/estatisticas.webp';
import PageTitle from '@/components/shared/PageTitle';
import AnimatedTabs, { type TabItem } from '@/components/shared/AnimatedTabs';
import { AnalyticsGeralView } from "../components/AnalyticsGeralView";
import { AnalyticsRivalidadesView } from "../components/AnalyticsRivalidadesView";
import { AnalyticsTimeView } from "../components/AnalyticsTimeView";
import { AnalyticsJogadorView } from "../components/AnalyticsJogadorView";
import { AnalyticsSinergiaView } from "../components/AnalyticsSinergiaView";

type TabType = "geral" | "jogador" | "time" | "sinergia" | "duplas";

const tabs: TabItem[] = [
  { id: "geral", label: "Geral", icon: <BarChart3 size={16} /> },
  { id: "jogador", label: "Jogador", icon: <User size={16} /> },
  { id: "time", label: "Time", icon: <Shield size={16} /> },
  { id: "sinergia", label: "Sinergia", icon: <Heart size={16} /> },
  { id: "duplas", label: "Rivalidades", icon: <Swords size={16} /> },
];

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("geral");
  const handleTabChange = useCallback((id: string) => setActiveTab(id as TabType), []);

  const content = useMemo(() => {
    switch (activeTab) {
      case "geral": return <AnalyticsGeralView />;
      case "jogador": return <AnalyticsJogadorView />;
      case "time": return <AnalyticsTimeView />;
      case "sinergia": return <AnalyticsSinergiaView />;
      case "duplas": return <AnalyticsRivalidadesView />;
      default: return null;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-24">
      <PageTitle
        icon={icEstatisticas}
        title="Analytics"
        subtitle="Mergulhe nos dados e descubra as lendas."
      />

      <AnimatedTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="pills"
      >
        {content}
      </AnimatedTabs>
    </div>
  );
}
