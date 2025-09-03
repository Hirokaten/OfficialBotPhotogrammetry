import { useQuery } from "@tanstack/react-query";

interface StatsData {
  totalLectures: number;
  activeStudents: number;
  totalDownloads: number;
  storageUsed: number;
}

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stats-card p-6 rounded-lg border border-border animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg"></div>
            </div>
            <div className="h-3 bg-muted rounded w-20 mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Всього лекцій",
      value: stats?.totalLectures || 0,
      change: "+12 цього місяця",
      icon: "fas fa-book",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Активних студентів",
      value: stats?.activeStudents || 0,
      change: "+24 цього тижня",
      icon: "fas fa-users",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      title: "Завантажень",
      value: stats?.totalDownloads || 0,
      change: "+156 сьогодні",
      icon: "fas fa-download",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Розмір файлів",
      value: formatFileSize(stats?.storageUsed || 0),
      change: "з 10 ГБ ліміту",
      icon: "fas fa-hdd",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsCards.map((card, index) => (
        <div key={index} className="stats-card p-6 rounded-lg border border-border" data-testid={`stats-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </div>
            <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
              <i className={`${card.icon} ${card.iconColor} text-lg`}></i>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">{card.change}</p>
        </div>
      ))}
    </div>
  );
}
