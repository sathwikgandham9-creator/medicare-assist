import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bell, Users, Pill, CalendarCheck, BarChart3, Settings } from 'lucide-react';

interface CaregiverNavProps {
  unreadAlertCount?: number;
}

export const CaregiverNav: React.FC<CaregiverNavProps> = ({ unreadAlertCount = 0 }) => {
  const links = [
    { to: '/caregiver/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/caregiver/alerts', label: 'Live Alerts', icon: Bell, badge: unreadAlertCount },
    { to: '/caregiver/patients', label: 'Patients', icon: Users },
    { to: '/caregiver/medicines', label: 'Medicines', icon: Pill },
    { to: '/caregiver/history', label: 'History & Calendar', icon: CalendarCheck },
    { to: '/caregiver/analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { to: '/caregiver/settings', label: 'Settings & Demo', icon: Settings },
  ];

  return (
    <nav className="bg-slate-900 text-white rounded-2xl p-2 shadow-lg mb-6 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded-full animate-pulse">
                    {link.badge}
                  </span>
                )}
              </div>
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

