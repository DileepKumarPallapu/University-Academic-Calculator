import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Sun, Moon, Laptop, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { AcademicProfileModal } from '../common/AcademicProfileModal';
import type { ThemeMode } from '../../types';

export const Navbar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { profile } = useStudentProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/internals', label: 'Internals' },
    { to: '/gpa', label: 'SGPA' },
    { to: '/cgpa', label: 'CGPA' },
    { to: '/attendance', label: 'Attendance' },
  ];

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'system', label: 'System', icon: <Laptop className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full h-16 bg-[var(--nav-bg)] backdrop-blur-[20px] border-b border-[var(--nav-border)] no-print transition-colors">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[17px] sm:text-[19px] font-semibold tracking-tight text-[var(--text-primary)] hover:opacity-80 transition-opacity"
          >
            Academic Calculator
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-full text-[14px] transition-all ${
                    isActive
                      ? 'font-semibold text-[var(--nav-link-active)] bg-[var(--nav-link-active-bg)] border border-[var(--border-primary)] shadow-sm'
                      : 'text-[var(--nav-link)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Controls: Profile, Theme, Mobile Hamburger */}
          <div className="flex items-center gap-2">
            {/* Academic Profile Button */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              title="Student Academic Profile"
              aria-label="Student Academic Profile"
            >
              <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="hidden sm:inline max-w-[120px] truncate">
                {profile.name.trim() ? profile.name.trim().split(' ')[0] : 'Profile'}
              </span>
            </button>

            {/* Desktop Theme Control */}
            <div className="hidden sm:flex items-center rounded-lg bg-[var(--border-secondary)] p-0.5 border border-[var(--border-primary)]">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    theme === opt.value
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`Switch to ${opt.label} mode`}
                  aria-label={`Switch to ${opt.label} mode`}
                >
                  {opt.icon}
                  <span className="hidden lg:inline">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Mobile Menu Icon */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--border-secondary)] border border-[var(--border-primary)] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--surface)] border-b border-[var(--border-primary)] px-4 py-5 flex flex-col gap-3 shadow-xl animate-appleFadeIn">
            <div className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `py-2.5 px-3.5 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--nav-link-active-bg)] text-[var(--nav-link-active)] font-semibold'
                        : 'text-[var(--nav-link)] hover:bg-[var(--bg-tertiary)]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Mobile Profile Link */}
            <div className="pt-2 border-t border-[var(--border-secondary)]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center justify-between py-2 px-3.5 rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Academic Profile</span>
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-normal">
                  {profile.name.trim() || 'Set Details'}
                </span>
              </button>
            </div>

            {/* Theme selector in mobile drawer */}
            <div className="pt-3 border-t border-[var(--border-secondary)] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Appearance
              </span>
              <div className="flex items-center rounded-lg bg-[var(--border-secondary)] p-0.5 border border-[var(--border-primary)]">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      theme === opt.value
                        ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Academic Profile Modal */}
      <AcademicProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
};
