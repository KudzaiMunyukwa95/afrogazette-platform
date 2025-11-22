import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: HomeIcon,
      roles: ['admin', 'journalist'],
    },
    {
      name: 'Users',
      path: '/users',
      icon: UsersIcon,
      roles: ['admin'],
    },
    {
      name: 'Clients',
      path: '/clients',
      icon: UserGroupIcon,
      roles: ['admin', 'journalist'],
    },
    {
      name: 'Sales',
      path: '/sales',
      icon: ShoppingBagIcon,
      roles: ['admin', 'journalist'],
    },
    {
      name: 'Invoices',
      path: '/invoices',
      icon: DocumentTextIcon,
      roles: ['admin'],
    },
    {
      name: 'Commissions',
      path: '/commissions',
      icon: CurrencyDollarIcon,
      roles: ['admin', 'journalist'],
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: ChartBarIcon,
      roles: ['admin'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: CogIcon,
      roles: ['admin'],
    },
  ];

  const userRole = isAdmin() ? 'admin' : 'journalist';
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-50 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white border-r border-gray-200 lg:translate-x-0`}
      >
        <div className="h-full px-3 pb-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2 font-medium">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    onClick={() => onClose()}
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-lg group ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 transition duration-75" />
                    <span className="ml-3">{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="pt-4 mt-4 space-y-2 border-t border-gray-200">
            <div className="px-3 py-2">
              <p className="text-xs text-gray-500">
                © 2025 AfroGazette Media & Advertising
              </p>
              <p className="text-xs text-gray-400 mt-1">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
