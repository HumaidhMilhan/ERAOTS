import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PersonalInsightsPage from './PersonalInsightsPage';
import TeamPage from './TeamPage';
import AnalyticsPage from './AnalyticsPage';
import CompanyInsightsPage from './CompanyInsightsPage';
import SystemInsightsPage from './SystemInsightsPage';

export default function InsightsHubPage() {
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';

  const tabs = useMemo(() => {
    const isManager = role === 'MANAGER';
    const isHr = role === 'HR_MANAGER';
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isAdmin = isHr || isSuperAdmin;

    return [
      {
        key: 'personal',
        label: 'Personal Insights',
        subtitle: 'Individual attendance intelligence and punctuality trends',
        icon: 'person',
        show: true,
        render: () => <PersonalInsightsPage />,
      },
      {
        key: 'team',
        label: 'Team Insights',
        subtitle: 'Manager-level coverage and anomalies',
        icon: 'group',
        show: isManager,
        render: () => <TeamPage />,
      },
      {
        key: 'analytics',
        label: 'Analytics Reports',
        subtitle: 'Attendance exports and high-level charts',
        icon: 'bar_chart',
        show: isAdmin,
        render: () => <AnalyticsPage />,
      },
      {
        key: 'company',
        label: 'Company Intelligence',
        subtitle: 'Organization-wide workforce behavior insights',
        icon: 'corporate_fare',
        show: isAdmin,
        render: () => <CompanyInsightsPage />,
      },
      {
        key: 'system',
        label: 'System Intelligence',
        subtitle: 'Operational and security telemetry for super admins',
        icon: 'monitor_heart',
        show: isSuperAdmin,
        render: () => <SystemInsightsPage />,
      },
    ].filter((tab) => tab.show);
  }, [role]);

  const initialTab = tabs[0]?.key || 'personal';
  const [activeTab, setActiveTab] = useState(initialTab);
  const currentTab = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  if (!currentTab) {
    return null;
  }

  return (
    <div className="hub-shell">
      {tabs.length > 1 && (
        <section className="hub-tabs" aria-label="Insights views">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`hub-tab ${activeTab === tab.key ? 'hub-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.icon && <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>{tab.icon}</span>}
              <span className="hub-tab-label">{tab.label}</span>
            </button>
          ))}
        </section>
      )}

      <section className="hub-content">{currentTab.render()}</section>
    </div>
  );
}
