import React from 'react';
import { Compass, Bookmark, TrendingUp, User, Menu } from 'lucide-react';

interface MobileNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenMobileDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenMobileDrawer
}) => {
  const items = [
    { id: 'parcel-map', label: 'EXPLORE', icon: Compass },
    { id: 'conflicts', label: 'SAVED', icon: Bookmark },
    { id: 'insights', label: 'INSIGHTS', icon: TrendingUp },
    { id: 'dashboard', label: 'PROFILE', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-2 z-40 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentRoute === item.id || 
          (item.id === 'parcel-map' && ['parcel-map', 'property-details'].includes(currentRoute)) ||
          (item.id === 'insights' && ['insights'].includes(currentRoute)) ||
          (item.id === 'dashboard' && ['dashboard', 'settings', 'audit'].includes(currentRoute));

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}

      {/* Quick Access Drawer Button */}
      <button
        onClick={onOpenMobileDrawer}
        className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span className="text-[9px] uppercase tracking-wider">MORE</span>
      </button>
    </nav>
  );
};
