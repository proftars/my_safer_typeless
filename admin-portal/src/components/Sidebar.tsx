import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  const navItems = [
    { path: '/dashboard', label: '儀表板' },
    { path: '/history', label: '轉錄紀錄' },
    { path: '/vocabulary', label: '詞彙庫' },
    { path: '/settings', label: '設定' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">My Safer Typeless</h1>
        <p className="text-xs text-slate-400 mt-1">管理後台</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-3 rounded-md transition-colors ${
              isActive(item.path)
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors text-sm"
        >
          登出
        </button>
      </div>
    </div>
  )
}
