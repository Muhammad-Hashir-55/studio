import { ProcessingTab } from './ProcessingTab';
import { convertToPdf } from '@/app/actions';

const acceptedOfficeFiles = {
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

export function OfficeTab() {
  return (
    <ProcessingTab
      title="Convert Office to PDF"
      description="Transform your Word, Excel, and PowerPoint files into high-quality PDFs."
      acceptedFiles={acceptedOfficeFiles}
      multiple={true}
      processAction={convertToPdf}
      processButtonText="Convert to PDF"
      processButtonLoadingText="Converting..."
      minFiles={1}
      fileType="Office document"
    />
  );
}
