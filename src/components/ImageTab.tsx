import { ProcessingTab } from './ProcessingTab';
import { convertToPdf } from '@/app/actions';

const acceptedImageFiles = {
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
};

export function ImageTab() {
  return (
    <ProcessingTab
      title="Convert Images to PDF"
      description="Turn your JPG, PNG, BMP, and GIF images into a single, easy-to-share PDF file."
      acceptedFiles={acceptedImageFiles}
      multiple={true}
      processAction={convertToPdf}
      processButtonText="Convert to PDF"
      processButtonLoadingText="Converting..."
      minFiles={1}
      fileType="image"
    />
  );
}
