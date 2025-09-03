import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onFileSelect: (files: FileList) => void;
  className?: string;
}

export function FileUploadZone({ onFileSelect, className }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSelectFiles(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelectFiles(files);
    }
  };

  const validateAndSelectFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const maxSize = 20 * 1024 * 1024; // 20MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Невідповідний тип файлу",
          description: `${file.name} - підтримуються тільки PDF та зображення`,
          variant: "destructive",
        });
        continue;
      }

      // Check file size
      if (file.size > maxSize) {
        toast({
          title: "Файл занадто великий",
          description: `${file.name} перевищує ліміт в 20 МБ`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const dt = new DataTransfer();
      validFiles.forEach(file => dt.items.add(file));
      onFileSelect(dt.files);
    }
  };

  return (
    <div
      className={cn(
        "upload-zone border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center hover:border-blue-400 transition-colors cursor-pointer min-h-[120px] sm:min-h-[200px]",
        isDragOver && "border-primary bg-primary/10",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      data-testid="file-upload-zone"
    >
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <i className="fas fa-cloud-upload-alt text-2xl text-muted-foreground"></i>
      </div>
      <h4 className="text-lg font-medium text-foreground mb-2">Перетягніть файли сюди</h4>
      <p className="text-sm text-muted-foreground mb-4">або натисніть для вибору</p>
      <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
        <span className="flex items-center space-x-1">
          <i className="fas fa-file-pdf text-red-500"></i>
          <span>PDF</span>
        </span>
        <span className="flex items-center space-x-1">
          <i className="fas fa-image text-blue-500"></i>
          <span>JPG, PNG</span>
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        multiple
        data-testid="file-input"
      />
    </div>
  );
}