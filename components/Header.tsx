import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { UserProfile } from '../types';
import { UserMenu } from './UserMenu';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    userProfile: UserProfile | null;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, userProfile, onLogout }) => {
  return (
    <header className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-lg sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center space-x-4"
            aria-label="Página de inicio de ListosApp"
          >
            <LogoIcon className="h-8 w-8 text-slate-900 dark:text-white" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Listos<span className="text-blue-500">App</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            {userProfile && <UserMenu user={userProfile} onLogout={onLogout} />}
          </div>
        </div>
      </div>
    </header>
  );
};
