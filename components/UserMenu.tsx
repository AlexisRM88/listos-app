import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface UserMenuProps {
  user: UserProfile;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2">
        <img
          src={user.picture}
          alt={user.name}
          className="h-8 w-8 rounded-full object-cover border-2 border-slate-300 dark:border-slate-600"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700"></div>
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full text-left block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
