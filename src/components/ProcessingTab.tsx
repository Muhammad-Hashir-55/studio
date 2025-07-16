// @ts-nocheck
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDropzone } from './FileDropzone';
import { FilePreview } from './FilePreview';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, RefreshCw } from 'lucide-react';

interface ProcessingTabProps {
  title: string;
  description: string;
  acceptedFiles: Record<string, string[]>;
  multiple: boolean;
  processAction: (formData: FormData) => Promise<{ success: boolean; error?: string; downloadUrl?: string; }>;
  processButtonText: string;
  processButtonLoadingText: string;
  minFiles: number;
  fileType: string;
}

export function ProcessingTab({
  title,
  description,
  acceptedFiles,
  multiple,
  processAction,
  processButtonText,
  processButtonLoadingText,
  minFiles,
  fileType
}: ProcessingTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFilesAccepted = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => {
        const newFiles = acceptedFiles.filter(
            newFile => !prevFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
        );
        return [...prevFiles, ...newFiles];
    });
  }, []);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  }, []);

  const handleProcess = async () => {
    setIsLoading(true);
    setResultUrl(null);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const result = await processAction(formData);
      if (result.success && result.downloadUrl) {
        setResultUrl(result.downloadUrl);
        toast({
          title: "Success!",
          description: "Your file is ready for download.",
          variant: "default",
        });
      } else {
        toast({
          title: "An error occurred",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "An error occurred",
        description: "Could not process your request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
    setFiles([]);
    setResultUrl(null);
    setIsLoading(false);
  };

  if (resultUrl) {
    return (
        <Card className="text-center shadow-lg">
            <CardHeader>
                <CardTitle>Processing Complete!</CardTitle>
                <CardDescription>Your file has been successfully created.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">Click the button below to download your new PDF.</p>
                    <Button asChild size="lg" className="shadow-md">
                        <a href={resultUrl} download>
                            <Download className="mr-2 h-5 w-5" />
                            Download PDF
                        </a>
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="justify-center">
                 <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start Over
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FileDropzone 
          onFilesAccepted={handleFilesAccepted} 
          accept={acceptedFiles}
          multiple={multiple}
          disabled={isLoading}
        />
        {files.length > 0 && (
          <FilePreview files={files} onRemoveFile={handleRemoveFile} />
        )}
      </CardContent>
      <CardFooter className="flex-col sm:flex-row justify-between items-center gap-4">
         <p className="text-sm text-muted-foreground">
            {files.length} {fileType}{files.length !== 1 ? 's' : ''} selected.
         </p>
        <Button 
          onClick={handleProcess} 
          disabled={isLoading || files.length < minFiles}
          size="lg"
          className="w-full sm:w-auto shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {processButtonLoadingText}
            </>
          ) : (
            processButtonText
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
