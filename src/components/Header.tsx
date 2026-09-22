import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Wifi,
  WifiOff,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  RefreshCw,
  ChevronDown,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Terminal,
  LayoutGrid,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { User, ExpertProfile } from '../types.js';
import { OfflinePendingScan } from '../lib/offlineDb.js';

interface HeaderProps {
  currentUser: User | null;
  expertProfile?: ExpertProfile;
  allDemoUsers: User[];
  onSwitchUser: (userId: string) => void;
  isOnline: boolean;
  onToggleOnlineMode?: () => void;
  pendingScans: OfflinePendingScan[];
  onSyncPendingScans: () => void;
  isSyncing: boolean;
  activeView: 'farmer' | 'expert' | 'admin' | 'knowledge';
  setActiveView: (view: 'farmer' | 'expert' | 'admin' | 'knowledge') => void;
  isDemoMode: boolean;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  expertProfile,
  allDemoUsers,
  onSwitchUser,
  isOnline,
  onToggleOnlineMode,
  pendingScans,
  onSyncPendingScans,
  isSyncing,
  activeView,
  setActiveView,
  isDemoMode,
  onOpenAuthModal,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock the background page while the mobile drawer is open so it can't
  // be scrolled/revealed underneath (same fix applied to the auth modal).
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const scrollY = window.scrollY;
    const { body } = document;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [mobileMenuOpen]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'farmer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            Smallholder Farmer
          </span>
        );
      case 'expert':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
            <UserCheck className="w-3 h-3" />
            {expertProfile?.verificationStatus === 'verified' ? 'Verified Expert' : 'Pending Expert'}
          </span>
        );
      case 'senior_expert':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800">
            <GraduationCap className="w-3 h-3" /> Senior Specialist
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <ShieldAlert className="w-3 h-3" /> System Admin
          </span>
        );
      default:
        return null;
    }
  };

  const navItems: Array<{
    id: 'farmer' | 'expert' | 'knowledge' | 'admin';
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    activeClasses: string;
  }> = [
    {
      id: 'farmer',
      label: 'Farm Monitor',
      shortLabel: 'Monitor',
      icon: <LayoutGrid className="w-5 h-5" />,
      activeClasses: 'text-emerald-400',
    },
    {
      id: 'expert',
      label: 'Expert Review',
      shortLabel: 'Review',
      icon: <UserCheck className="w-5 h-5" />,
      activeClasses: 'text-blue-400',
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      shortLabel: 'Learn',
      icon: <BookOpen className="w-5 h-5" />,
      activeClasses: 'text-stone-200',
    },
    {
      id: 'admin',
      label: 'Admin',
      shortLabel: 'Admin',
      icon: <ShieldAlert className="w-5 h-5" />,
      activeClasses: 'text-amber-400',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo & National Agricultural Context */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-inner font-bold">
                <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-base sm:text-lg text-stone-100 tracking-tight truncate">
                    CropWatch Liberia
                  </span>
                  <span className="hidden md:inline-block shrink-0 text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded border border-stone-700">
                    CARI & MOA Pilot
                  </span>
                  {isDemoMode && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded">
                      <Terminal className="w-3 h-3" /> DEMO
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 hidden lg:block truncate">
                  AI & Human-in-the-Loop Crop Health Decision Platform
                </p>
              </div>
            </div>

            {/* Primary View Navigation — desktop / tablet only, mobile uses bottom tab bar */}
            <nav className="hidden md:flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 shrink-0">
              <button
                onClick={() => setActiveView('farmer')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeView === 'farmer'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                Farm Monitor
              </button>

              <button
                onClick={() => setActiveView('expert')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors relative ${
                  activeView === 'expert'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                Expert Review
                <span className="ml-1.5 px-1.5 py-0.2 bg-blue-900 text-blue-200 text-[10px] rounded-full hidden lg:inline">
                  Center
                </span>
              </button>

              <button
                onClick={() => setActiveView('knowledge')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeView === 'knowledge'
                    ? 'bg-stone-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                Knowledge Base
              </button>

              <button
                onClick={() => setActiveView('admin')}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeView === 'admin'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                Admin
              </button>
            </nav>

            {/* Right Controls: Connectivity & Persona Switcher (desktop / tablet) */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-3">
              {/* Offline Simulation Toggle & Sync */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleOnlineMode}
                  title="Toggle Online/Offline Network Simulation"
                  className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs border transition-colors ${
                    isOnline
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/70 border-red-800 text-red-300 animate-pulse'
                  }`}
                >
                  {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
                </button>

                {pendingScans.length > 0 && (
                  <button
                    onClick={onSyncPendingScans}
                    disabled={!isOnline || isSyncing}
                    className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-sm transition-all disabled:opacity-50"
                    title="Upload queued offline observations"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Sync ({pendingScans.length})</span>
                    <span className="sm:hidden">{pendingScans.length}</span>
                  </button>
                )}
              </div>

              {/* Persona Switcher / Auth Control */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="font-semibold text-stone-200 leading-none">{currentUser.fullName}</p>
                      <p className="text-[10px] text-stone-400 capitalize">{currentUser.county} Co.</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
                  </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] bg-stone-900 border border-stone-800 rounded-xl shadow-2xl py-2 z-50 max-h-[75vh] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-stone-800">
                      <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Active Session</p>
                      <p className="text-sm font-bold text-white">{currentUser.fullName}</p>
                      <p className="text-xs text-stone-400">{currentUser.email || 'No email specified'}</p>
                      <p className="text-xs text-stone-500">{currentUser.organization || 'Independent Smallholder'}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        {getRoleBadge(currentUser.role)}
                        {currentUser.supabaseId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono" title={`Auth UID: ${currentUser.supabaseId}`}>
                            <Sprout className="w-2.5 h-2.5" /> Cloud Auth
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 border border-stone-700 font-mono">
                            <Sprout className="w-2.5 h-2.5" /> Connected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Local dev DEMO SWITCHER only if DEMO_MODE env flag is enabled */}
                    {isDemoMode && allDemoUsers.length > 0 && (
                      <div className="px-3 py-2 border-b border-stone-800 bg-amber-950/20">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                            <Terminal className="w-3 h-3" /> Demo Mode Switcher
                          </p>
                          <span className="text-[9px] text-amber-500/80 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                            Local Dev Only
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {allDemoUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                onSwitchUser(u.id);
                                setShowUserDropdown(false);
                              }}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                                currentUser.id === u.id
                                  ? 'bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/50'
                                  : 'text-stone-300 hover:bg-stone-800/80'
                              }`}
                            >
                              <div>
                                <p className="font-medium">{u.fullName}</p>
                                <p className="text-[10px] text-stone-400 capitalize">
                                  {u.role.replace('_', ' ')} • {u.county}
                                </p>
                              </div>
                              {currentUser.id === u.id && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="px-2 pt-2 space-y-1">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAuthModal();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-stone-300 hover:bg-stone-800 flex items-center gap-2 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-stone-400" /> Switch Account / Re-login
                      </button>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-400" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
              </div>

              {/* Mobile-only: single drawer trigger replaces all controls above */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                className="md:hidden relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-750 text-stone-200 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                {!mobileMenuOpen && !isOnline && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-stone-900" />
                )}
                {!mobileMenuOpen && pendingScans.length > 0 && (
                  <span className="absolute -bottom-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-stone-950 flex items-center justify-center border-2 border-stone-900">
                    {pendingScans.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer — single trigger opens/closes a full-height slide-in panel
          holding nav, account, and connectivity controls (replaces separate
          top-bar buttons + bottom tab bar on small screens) */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />

        <div
          className={`absolute right-0 top-0 h-full w-[85%] max-w-xs bg-stone-900 border-l border-stone-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-stone-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Sprout className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-stone-100 truncate">Menu</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Account Section */}
            <div className="p-4 border-b border-stone-800">
              {currentUser ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0">
                      {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-100 truncate">{currentUser.fullName}</p>
                      <p className="text-xs text-stone-400 truncate">
                        {currentUser.email || `${currentUser.county} Co.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    {getRoleBadge(currentUser.role)}
                    {currentUser.supabaseId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                        <Sprout className="w-2.5 h-2.5" /> Cloud Auth
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 border border-stone-700 font-mono">
                        <Sprout className="w-2.5 h-2.5" /> Connected
                      </span>
                    )}
                  </div>

                  {isDemoMode && allDemoUsers.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                          <Terminal className="w-3 h-3" /> Demo Switcher
                        </p>
                        <span className="text-[9px] text-amber-500/80 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                          Local Dev Only
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {allDemoUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                              currentUser.id === u.id
                                ? 'bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/50'
                                : 'text-stone-300 hover:bg-stone-800/80'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{u.fullName}</p>
                              <p className="text-[10px] text-stone-400 capitalize truncate">
                                {u.role.replace('_', ' ')} • {u.county}
                              </p>
                            </div>
                            {currentUser.id === u.id && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-stone-300 bg-stone-800 hover:bg-stone-750 border border-stone-700 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" /> Switch
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-400 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md transition-colors"
                >
                  <LogIn className="w-4 h-4" /> Sign In / Register
                </button>
              )}
            </div>

            {/* Navigation Section */}
            <div className="p-2 border-b border-stone-800">
              <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                Navigate
              </p>
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? `bg-stone-800 ${item.activeClasses}` : 'text-stone-300 hover:bg-stone-800/60'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Connectivity Section */}
            <div className="p-3 space-y-2">
              <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                Connectivity
              </p>
              <button
                onClick={onToggleOnlineMode}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  isOnline
                    ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/70 border-red-800 text-red-300 animate-pulse'
                }`}
              >
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isOnline ? 'Online' : 'Offline Mode'}
              </button>

              {pendingScans.length > 0 && (
                <button
                  onClick={onSyncPendingScans}
                  disabled={!isOnline || isSyncing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync ({pendingScans.length} pending)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
