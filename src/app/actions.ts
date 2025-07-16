'use server';

import { PDFDocument, rgb } from 'pdf-lib';
import bmp from 'bmp-js';
import { parse } from 'gifuct-js';

export async function mergePdfs(formData: FormData) {
  const files = formData.getAll('files') as File[];

  if (!files || files.length < 2) {
    return { success: false, error: 'Please upload at least two PDFs to merge.' };
  }

  try {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');
    
    return { success: true, downloadUrl: `data:application/pdf;base64,${mergedPdfBase64}` };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to merge PDFs. Please ensure all files are valid PDFs.' };
  }
}

export async function convertToPdf(formData: FormData) {
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return { success: false, error: 'Please upload at least one file to convert.' };
  }

  try {
    const newPdf = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      
      if (file.type.startsWith('image/')) {
        let image;
        if (file.type === 'image/jpeg') {
          image = await newPdf.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
          image = await newPdf.embedPng(arrayBuffer);
        } else if (file.type === 'image/bmp') {
          const bmpData = bmp.decode(Buffer.from(arrayBuffer));
          image = await newPdf.embedPng(bmp.encode(bmpData).data);
        } else if (file.type === 'image/gif') {
            const gif = parse(arrayBuffer);
            const frames = gif.frames.filter(frame => frame.image);
            if (frames.length === 0) {
                console.warn(`Could not extract frames from GIF: ${file.name}`);
                continue;
            }
            // Use the first frame of the GIF
            const frame = frames[0];
            const { width, height, patch } = frame;
            const frameImageData = new Uint8ClampedArray(patch);

            const pngData = await new Promise<Buffer>((resolve) => {
                const chunks: Buffer[] = [];
                // This is a simplified conversion, might need a proper PNG encoder library for complex GIFs
                 const pngEncoder = new (require('pngjs').PNG)({ width, height });
                 pngEncoder.data = Buffer.from(frameImageData);
                 pngEncoder.pack().on('data', (chunk: Buffer) => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks)));
            });
            image = await newPdf.embedPng(pngData);
        } else {
            console.warn(`Unsupported image type for conversion: ${file.type}`);
            return { success: false, error: `Image type for "${file.name}" is not supported.`};
        }

        const page = newPdf.addPage();
        const { width, height } = image.scale(1);
        page.setSize(width, height);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
        });
      } else {
        // For now, we only support images. We can add Office document conversion later.
        console.warn(`Unsupported file type for conversion: ${file.type}`);
        return { success: false, error: `File type for "${file.name}" is not supported for conversion.`};
      }
    }

    const newPdfBytes = await newPdf.save();
    const newPdfBase64 = Buffer.from(newPdfBytes).toString('base64');

    return { success: true, downloadUrl: `data:application/pdf;base64,${newPdfBase64}` };

  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to convert files to PDF. Please ensure all files are valid images.' };
  }
}
