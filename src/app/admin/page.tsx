'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import SiteContentTab from './components/SiteContentTab';
import SettingsTab from './components/SettingsTab';

type TabType = 'site-content' | 'settings';

const tabs = [
  { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' },
  { id: 'site-content' as TabType, label: 'Site Content', icon: '📝' },
];

export default function AdminPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (status === 'unauthenticated') {
    redirect('/admin/login');
  }

  return (
    <div className="pt-16">
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-4 text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Manage your website content and settings
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            {/* Mobile: Dropdown */}
            <div className="sm:hidden">
              <label htmlFor="tab-select" className="sr-only">
                Select a tab
              </label>
              <select
                id="tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as TabType)}
                className="admin-tab-select block w-full rounded-lg border-2 border-border bg-card px-4 py-3 pr-12 text-foreground shadow-sm focus:border-primary focus:ring-2 focus:ring-primary appearance-none bg-size-[1.5rem_1.5rem] bg-position-[right_1rem_center] bg-no-repeat"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.icon} {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop: Horizontal Tabs */}
            <div className="hidden sm:block border-b border-border">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }
                    `}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'site-content' && <SiteContentTab />}
          </div>
        </div>
      </div>
    </div>
  );
}