import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lecture } from "@shared/schema";

export function LecturesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lectures = [], isLoading } = useQuery<Lecture[]>({
    queryKey: ["/api/lectures"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/lectures/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lectures"] });
      toast({
        title: "Успіх",
        description: "Лекцію видалено",
      });
    },
    onError: () => {
      toast({
        title: "Помилка",
        description: "Не вдалося видалити лекцію",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getSubjectBadgeColor = (subject: string) => {
    const colors: Record<string, string> = {
      photogrammetry: "bg-purple-500/10 text-purple-700",
    };
    return colors[subject] || "bg-purple-500/10 text-purple-700";
  };

  const getFileIcon = (fileType: string) => {
    return fileType === 'pdf' ? 'fas fa-file-pdf text-red-600' : 'fas fa-image text-blue-600';
  };

  const filteredLectures = lectures.filter(lecture =>
    lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecture.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Останні лекції</h3>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Останні лекції</h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Пошук лекцій..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
                data-testid="search-lectures"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto table-container">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Назва</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Предмет</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Тип файлу</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Розмір</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Завантажень</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Дата</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Дії</th>
            </tr>
          </thead>
          <tbody>
            {filteredLectures.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <i className="fas fa-book text-4xl mb-4"></i>
                    <p className="text-lg font-medium">Лекції відсутні</p>
                    <p className="text-sm">Завантажте першу лекцію для початку роботи</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLectures.map((lecture) => (
                <tr key={lecture.id} className="border-b border-border hover:bg-muted/50" data-testid={`lecture-row-${lecture.id}`}>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${lecture.fileType === 'pdf' ? 'bg-red-500/10' : 'bg-blue-500/10'} rounded-lg flex items-center justify-center`}>
                        <i className={getFileIcon(lecture.fileType)}></i>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{lecture.title}</p>
                        <p className="text-sm text-muted-foreground">{lecture.fileName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubjectBadgeColor(lecture.subject)}`}>
                      {lecture.subject}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground uppercase">{lecture.fileType}</td>
                  <td className="p-4 text-sm text-muted-foreground">{formatFileSize(lecture.fileSize)}</td>
                  <td className="p-4 text-sm text-foreground font-medium">{lecture.downloadCount}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(lecture.createdAt).toLocaleDateString('uk-UA')}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                        onClick={() => window.open(`/uploads/${lecture.fileName}`, '_blank')}
                        data-testid={`preview-lecture-${lecture.id}`}
                      >
                        <i className="fas fa-eye text-muted-foreground"></i>
                      </button>
                      <button 
                        className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                        onClick={() => deleteMutation.mutate(lecture.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`delete-lecture-${lecture.id}`}
                      >
                        <i className="fas fa-trash text-destructive"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredLectures.length > 0 && (
        <div className="p-4 sm:p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Показано {filteredLectures.length} з {lectures.length} лекцій
            </p>
          </div>
        </div>
      )}
    </div>
  );
}