import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "@/components/sidebar";
import { StatsCards } from "@/components/stats-cards";
import { FileUploadZone } from "@/components/file-upload-zone";
import { LecturesTable } from "@/components/lectures-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/lectures", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lectures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSelectedFiles(null);
      setFormData({ title: "", subject: "", description: "" });
      toast({
        title: "Успіх!",
        description: "Лекцію успішно завантажено",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Помилка",
        description: error.message || "Не вдалося завантажити лекцію",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList) => {
    setSelectedFiles(files);
    if (files.length > 0 && !formData.title) {
      const fileName = files[0].name.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, title: fileName }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Помилка",
        description: "Оберіть файл для завантаження",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.subject) {
      toast({
        title: "Помилка", 
        description: "Заповніть всі обов'язкові поля",
        variant: "destructive",
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFiles[0]);
    formDataToSend.append('title', formData.title);
    formDataToSend.append('subject', formData.subject);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('uploadedBy', 'admin'); // In production, get from auth

    uploadMutation.mutate(formDataToSend);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* File Upload Section */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">Завантажити лекцію</h3>
                  </div>

                  <FileUploadZone onFileSelect={handleFileSelect} />

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-sm">Назва лекції</Label>
                      <Input
                        id="title"
                        type="text"
                        placeholder="Введіть назву лекції"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        data-testid="input-lecture-title"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="subject" className="text-sm">Предмет</Label>
                      <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                        <SelectTrigger data-testid="select-subject" className="mt-1">
                          <SelectValue placeholder="Оберіть предмет" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photogrammetry">Фотограмметрія</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className="text-sm">Опис</Label>
                      <Textarea
                        id="description"
                        placeholder="Короткий опис лекції"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        data-testid="textarea-description"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={uploadMutation.isPending}
                        data-testid="button-upload-lecture"
                      >
                        <i className="fas fa-upload mr-2"></i>
                        {uploadMutation.isPending ? "Завантажую..." : "Завантажити лекцію"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="sm:w-auto"
                        onClick={() => {
                          setSelectedFiles(null);
                          setFormData({ title: "", subject: "", description: "" });
                        }}
                        data-testid="button-cancel"
                      >
                        Скасувати
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4 lg:space-y-6">
                <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-foreground mb-4">Швидкі дії</h3>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      data-testid="button-bulk-upload"
                      onClick={() => {
                        toast({
                          title: "Масове завантаження",
                          description: "Функція буде доступна в наступній версії",
                        });
                      }}
                    >
                      <i className="fas fa-folder-plus text-primary mr-3"></i>
                      <span className="text-sm">Масове завантаження</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      data-testid="button-export-data"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/export');
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = `photogrammetry_backup_${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            toast({
                              title: "Успіх",
                              description: "Резервна копія завантажена",
                            });
                          } else {
                            throw new Error('Помилка експорту');
                          }
                        } catch (error) {
                          toast({
                            title: "Помилка",
                            description: "Не вдалося створити резервну копію",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <i className="fas fa-database text-primary mr-3"></i>
                      <span className="text-sm">Резервна копія БД</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      data-testid="button-send-announcement"
                      onClick={() => {
                        const message = prompt('Введіть текст оголошення для всіх студентів:');
                        if (message) {
                          fetch('/api/broadcast', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message })
                          })
                          .then(response => {
                            if (response.ok) {
                              toast({
                                title: "Успіх",
                                description: "Оголошення надіслано всім студентам",
                              });
                            } else {
                              throw new Error('Помилка відправки');
                            }
                          })
                          .catch(() => {
                            toast({
                              title: "Помилка",
                              description: "Не вдалося відправити оголошення",
                              variant: "destructive",
                            });
                          });
                        }
                      }}
                    >
                      <i className="fas fa-bullhorn text-primary mr-3"></i>
                      <span className="text-sm">Розіслати оголошення</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      
      case "lectures":
        return <LecturesTable />;
      
      default:
        return (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <i className="fas fa-tools text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold text-foreground mb-2">В розробці</h3>
            <p className="text-muted-foreground">Ця секція буде доступна незабаром</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />}
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={(tab) => {
                setActiveTab(tab);
                setSidebarOpen(false);
              }} 
            />
          </SheetContent>
        </Sheet>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <i className="fas fa-bars text-foreground"></i>
                    </Button>
                  </SheetTrigger>
                </Sheet>
              )}
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">Панель керування</h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Управління лекціями та студентами</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="ghost" size="sm" data-testid="button-toggle-theme">
                <i className="fas fa-moon text-muted-foreground"></i>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-primary-foreground text-xs sm:text-sm"></i>
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground hidden sm:inline">Адмін</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
