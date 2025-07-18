'use server';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import bmp from 'bmp-js';
import { parse } from 'gifuct-js';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import JSZip from 'jszip';


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

async function addTextToPdf(pdfDoc: PDFDocument, text: string) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const textWidth = width - 2 * margin;

    const lines = text.split('\n');
    let y = height - margin;

    for (const line of lines) {
        if (y < margin) {
            const newPage = pdfDoc.addPage();
            page.setSize(width, height);
            y = height - margin;
        }
        page.drawText(line, {
            x: margin,
            y,
            font,
            size: fontSize,
            color: rgb(0, 0, 0),
            maxWidth: textWidth,
            lineHeight: 15,
        });
        y -= 15;
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
      const fileType = file.type;
      
      if (fileType.startsWith('image/')) {
        let image;
        if (fileType === 'image/jpeg') {
          image = await newPdf.embedJpg(arrayBuffer);
        } else if (fileType === 'image/png') {
          image = await newPdf.embedPng(arrayBuffer);
        } else if (fileType === 'image/bmp') {
          const bmpData = bmp.decode(Buffer.from(arrayBuffer));
          image = await newPdf.embedPng(bmp.encode(bmpData).data);
        } else if (fileType === 'image/gif') {
            const gif = parse(arrayBuffer);
            const frames = gif.frames.filter(frame => frame.image);
            if (frames.length === 0) {
                console.warn(`Could not extract frames from GIF: ${file.name}`);
                continue;
            }
            const frame = frames[0];
            const { width, height } = frame;

            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if(!ctx) continue;
            
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(new Uint8ClampedArray(frame.patch));
            ctx.putImageData(imageData, 0, 0);

            const blob = await canvas.convertToBlob({ type: 'image/png' });
            const pngArrayBuffer = await blob.arrayBuffer();
            image = await newPdf.embedPng(pngArrayBuffer);
        } else {
            console.warn(`Unsupported image type for conversion: ${fileType}`);
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
      } else if (fileType.includes('word')) { // .doc, .docx
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          await addTextToPdf(newPdf, value);
      } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) { // .xls, .xlsx
          const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
          let fullText = '';
          workbook.SheetNames.forEach(sheetName => {
              const sheet = workbook.Sheets[sheetName];
              const text = xlsx.utils.sheet_to_txt(sheet);
              fullText += `Sheet: ${sheetName}\n\n${text}\n\n`;
          });
          await addTextToPdf(newPdf, fullText);
      } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) { // .ppt, .pptx
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            let fullText = '';
            const slidePromises: Promise<void>[] = [];

            zip.folder('ppt/slides')?.forEach((relativePath, file) => {
              if (file.name.endsWith('.xml')) {
                  slidePromises.push(
                      file.async('text').then(content => {
                          const textNodes = content.match(/<a:t>.*?<\/a:t>/g) || [];
                          const slideText = textNodes.map(node => node.replace(/<a:t>(.*?)<\/a:t>/, '$1')).join(' ');
                          fullText += slideText + '\n';
                      })
                  );
              }
            });

            await Promise.all(slidePromises);
            await addTextToPdf(newPdf, fullText);
          } catch(e) {
            // Fallback for older .ppt or complex files
            await addTextToPdf(newPdf, 'PowerPoint to PDF conversion is limited. Only text from .pptx files is extracted. Formatting and images are not preserved.');
          }
      } else {
        console.warn(`Unsupported file type for conversion: ${fileType}`);
        return { success: false, error: `File type for "${file.name}" is not supported for conversion.`};
      }
    }

    const newPdfBytes = await newPdf.save();
    const newPdfBase64 = Buffer.from(newPdfBytes).toString('base64');

    return { success: true, downloadUrl: `data:application/pdf;base64,${newPdfBase64}` };

  } catch (error) {
    console.error(error);
    return { success: false, error: `Failed to convert files to PDF. Please ensure all files are valid and supported. Error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
