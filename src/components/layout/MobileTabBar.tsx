import React from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, Calculator, Award, Layers, MoreHorizontal } from 'lucide-react';

interface MobileTabBarProps {
  onOpenMore: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ onOpenMore }) => {
  const tabs = [
    { to: '/', label: 'Home', icon: GraduationCap },
    { to: '/internals', label: 'Internals', icon: Calculator },
    { to: '/gpa', label: 'GPA', icon: Award },
    { to: '/cgpa', label: 'CGPA', icon: Layers },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#000000]/90 backdrop-blur-xl border-t border-black/[0.08] dark:border-white/[0.12] pb-[env(safe-area-inset-bottom)] no-print"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="h-16 flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 transition-colors min-h-[44px] ${
                  isActive
                    ? 'text-black dark:text-white font-semibold'
                    : 'text-[#86868B] dark:text-[#A1A1A6]'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </NavLink>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#86868B] dark:text-[#A1A1A6] min-h-[44px]"
          aria-label="Open more tools and settings"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
