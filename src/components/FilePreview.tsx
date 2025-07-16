'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { File, FileImage, FileText, Presentation, Sheet, X } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface FilePreviewProps {
  files: File[];
  onRemoveFile: (file: File) => void;
}

const getFileIcon = (fileType: string): React.ReactElement => {
  if (fileType.startsWith('image/')) return <FileImage className="h-6 w-6 text-chart-5" />;
  if (fileType === 'application/pdf') return <FileText className="h-6 w-6 text-chart-1" />;
  if (fileType.includes('word')) return <FileText className="h-6 w-6 text-chart-2" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <Sheet className="h-6 w-6 text-chart-3" />;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <Presentation className="h-6 w-6 text-chart-4" />;
  return <File className="h-6 w-6 text-muted-foreground" />;
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export function FilePreview({ files, onRemoveFile }: FilePreviewProps) {
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const newImagePreviews: Record<string, string> = {};
    files.forEach(file => {
      if (file.type.startsWith('image/') && !imagePreviews[file.name]) {
        newImagePreviews[file.name] = URL.createObjectURL(file);
      }
    });
    setImagePreviews(prev => ({...prev, ...newImagePreviews}));

    return () => {
      Object.values(newImagePreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  return (
    <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Selected Files</h3>
        <ScrollArea className="h-64 w-full rounded-md border p-4">
            {files.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Your uploaded files will appear here.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {files.map(file => (
                        <li key={file.name + file.lastModified} className="flex items-center justify-between p-3 rounded-md bg-secondary/50 animate-in fade-in-50">
                            <div className="flex items-center gap-4 truncate">
                                {imagePreviews[file.name] ? (
                                <Image
                                    src={imagePreviews[file.name]}
                                    alt={file.name}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded-md object-cover"
                                />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-background">
                                       {getFileIcon(file.type)}
                                    </div>
                                )}
                                <div className="truncate">
                                    <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(file.size)}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onRemoveFile(file)} className="flex-shrink-0">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove file</span>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </ScrollArea>
    </div>
  );
}
