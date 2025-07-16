import { PdfTool } from '@/components/PdfTool';
import { Merge } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-background to-background -z-10"></div>
      <header className="text-center mb-8 md:mb-12">
        <div className="inline-flex items-center justify-center bg-primary text-primary-foreground p-3 rounded-full mb-4 shadow-lg">
          <Merge className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline tracking-tight">PDFusion</h1>
        <p className="text-muted-foreground mt-2 text-lg md:text-xl max-w-2xl mx-auto">
          Your complete toolkit for PDF management. Merge multiple PDFs, or convert Office documents and images into a single, polished PDF file.
        </p>
      </header>
      <main className="w-full max-w-4xl">
        <PdfTool />
      </main>
      <footer className="mt-8 md:mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} PDFusion. All rights reserved.</p>
      </footer>
    </div>
  );
}
