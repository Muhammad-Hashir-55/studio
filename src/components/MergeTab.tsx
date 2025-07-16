import { ProcessingTab } from './ProcessingTab';
import { mergePdfs } from '@/app/actions';

export function MergeTab() {
  return (
    <ProcessingTab
      title="Merge PDF Files"
      description="Combine multiple PDFs into one unified document. Drag and drop your files below."
      acceptedFiles={{ 'application/pdf': ['.pdf'] }}
      multiple={true}
      processAction={mergePdfs}
      processButtonText="Merge PDFs"
      processButtonLoadingText="Merging..."
      minFiles={2}
      fileType="PDF"
    />
  );
}
