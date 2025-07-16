'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  accept: Record<string, string[]>;
  multiple: boolean;
  disabled: boolean;
}

export function FileDropzone({ onFilesAccepted, accept, multiple, disabled }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileValidation = (files: FileList | null): File[] => {
    if (!files) return [];
    const acceptedMimeTypes = Object.keys(accept);
    const acceptedExtensions = Object.values(accept).flat();

    return Array.from(files).filter(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValid = acceptedMimeTypes.includes(file.type) || acceptedExtensions.includes(fileExtension);
      if (!isValid) {
        toast({
          title: 'Invalid File Type',
          description: `File "${file.name}" was not added. Please upload a supported file type.`,
          variant: 'destructive'
        });
      }
      return isValid;
    });
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    
    const validFiles = handleFileValidation(e.dataTransfer.files);
    if (validFiles.length > 0) {
        onFilesAccepted(validFiles);
    }
  }, [disabled, onFilesAccepted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validFiles = handleFileValidation(e.target.files);
    if (validFiles.length > 0) {
      onFilesAccepted(validFiles);
    }
    // Reset input value to allow re-uploading the same file
    if(inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ease-in-out",
        "border-border bg-background hover:border-accent hover:bg-accent/10",
        isDragOver && "border-primary bg-primary/10",
        disabled && "cursor-not-allowed opacity-50"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={Object.keys(accept).join(',')}
        multiple={multiple}
        disabled={disabled}
      />
      <div className="text-center pointer-events-none">
        <UploadCloud className={cn("mx-auto h-12 w-12 transition-colors", isDragOver ? "text-primary": "text-muted-foreground")} />
        <p className="mt-4 text-lg font-semibold text-foreground">
          Drag & drop files here
        </p>
        <p className="mt-1 text-sm text-muted-foreground">or click to browse your computer</p>
      </div>
    </div>
  );
}
