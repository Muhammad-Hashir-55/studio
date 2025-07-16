import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MergeTab } from './MergeTab';
import { OfficeTab } from './OfficeTab';
import { ImageTab } from './ImageTab';
import { FileUp, Images, MergeIcon } from 'lucide-react';

export function PdfTool() {
  return (
    <Tabs defaultValue="merge" className="w-full">
      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-12">
        <TabsTrigger value="merge" className="py-2.5">
          <MergeIcon className="mr-2 h-5 w-5" />
          Merge PDFs
        </TabsTrigger>
        <TabsTrigger value="office-to-pdf" className="py-2.5">
          <FileUp className="mr-2 h-5 w-5" />
          Office to PDF
        </TabsTrigger>
        <TabsTrigger value="image-to-pdf" className="py-2.5">
          <Images className="mr-2 h-5 w-5" />
          Images to PDF
        </TabsTrigger>
      </TabsList>
      <TabsContent value="merge" className="mt-6">
        <MergeTab />
      </TabsContent>
      <TabsContent value="office-to-pdf" className="mt-6">
        <OfficeTab />
      </TabsContent>
      <TabsContent value="image-to-pdf" className="mt-6">
        <ImageTab />
      </TabsContent>
    </Tabs>
  );
}
