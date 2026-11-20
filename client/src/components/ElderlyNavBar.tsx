import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Pill, History, HelpCircle } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export const ElderlyNavBar: React.FC = () => {
  const { t } = useAccessibility();

  const navItems = [
    { to: '/elderly/today', label: t('todayTab'), icon: Calendar },
    { to: '/elderly/medicines', label: t('medicinesTab'), icon: Pill },
    { to: '/elderly/history', label: t('historyTab'), icon: History },
    { to: '/elderly/help', label: t('helpTab'), icon: HelpCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-300 shadow-2xl safe-area-pb">
      <div className="max-w-4xl mx-auto grid grid-cols-4 gap-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `min-h-[64px] flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white font-black shadow-md scale-[1.02]'
                    : 'text-slate-700 hover:bg-slate-100 font-bold'
                }`
              }
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8 mb-1 stroke-[2.2]" />
              <span className="text-sm sm:text-base md:text-lg leading-tight text-center truncate max-w-full">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

