import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [botStatus] = useState(true);

  const navItems = [
    { id: 'overview', label: 'Огляд', icon: 'fas fa-chart-line' },
    { id: 'lectures', label: 'Лекції', icon: 'fas fa-book' },
    { id: 'students', label: 'Студенти', icon: 'fas fa-users' },
    { id: 'upload', label: 'Завантажити', icon: 'fas fa-upload' },
    { id: 'settings', label: 'Налаштування', icon: 'fas fa-cog' },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo & Title */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-primary-foreground text-lg"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">PhotogrammetryBot</h1>
            <p className="text-sm text-muted-foreground">Панель фотограмметрії</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "sidebar-nav-item w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-150",
              activeTab === item.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            data-testid={`nav-${item.id}`}
          >
            <i className={`${item.icon} w-5`}></i>
            <span className={activeTab === item.id ? "font-medium" : ""}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bot Status */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2 text-sm">
          <div className={cn(
            "w-2 h-2 rounded-full",
            botStatus ? "bg-green-500 animate-pulse" : "bg-red-500"
          )}></div>
          <span className="text-muted-foreground">
            {botStatus ? "Бот онлайн" : "Бот офлайн"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">@Official_Photogrammetry_Bot</p>
      </div>
    </div>
  );
}
