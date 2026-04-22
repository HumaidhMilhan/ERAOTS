import { useEffect, useMemo, useState } from 'react';
import EmployeesPage from './EmployeesPage';
import DepartmentsPage from './DepartmentsPage';

export default function DirectoryHubPage() {
  const tabs = useMemo(
    () => [
      {
        key: 'employees',
        label: 'Employee Directory',
        subtitle: 'Profiles, roles, and active status management',
        icon: 'person',
        render: () => <EmployeesPage />,
      },
      {
        key: 'departments',
        label: 'Department Registry',
        subtitle: 'Organizational units, headcount, and team structure',
        icon: 'corporate_fare',
        render: () => <DepartmentsPage />,
      },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState('employees');

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  const currentTab = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <div className="hub-shell">
      <section className="hub-tabs" aria-label="Directory views">
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

      <section className="hub-content">{currentTab.render()}</section>
    </div>
  );
}
