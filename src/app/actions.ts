'use server';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import bmp from 'bmp-js';
import { parse } from 'gifuct-js';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import JSZip from 'jszip';
import { PNG } from 'pngjs';


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
    const lineHeight = 15;
    const margin = 50;
    const textWidth = width - 2 * margin;

    let y = height - margin;

    const words = text.split(/(\s+)/);
    let currentLine = '';
    
    for (const word of words) {
        const potentialLine = currentLine + word;
        const currentWidth = font.widthOfTextAtSize(potentialLine, fontSize);

        if (currentWidth > textWidth && currentLine.length > 0) {
            page.drawText(currentLine, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
            y -= lineHeight;
            currentLine = word.trimStart();

            if (y < margin) {
                const newPage = pdfDoc.addPage();
                y = newPage.getHeight() - margin;
            }
        } else {
            currentLine = potentialLine;
        }
    }

    if (currentLine.trim() !== '') {
        page.drawText(currentLine, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
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
          const png = new PNG({ width: bmpData.width, height: bmpData.height });
          // The bmp-js library provides data in ABGR format, PNG needs RGBA.
          for (let i = 0; i < bmpData.data.length; i += 4) {
              const a = bmpData.data[i];
              const b = bmpData.data[i + 1];
              const g = bmpData.data[i + 2];
              const r = bmpData.data[i + 3];
              png.data[i] = r;
              png.data[i + 1] = g;
              png.data[i + 2] = b;
              png.data[i + 3] = a;
          }
          const pngBuffer = PNG.sync.write(png);
          image = await newPdf.embedPng(pngBuffer);
        } else if (fileType === 'image/gif') {
            const gif = parse(arrayBuffer);
            if (!gif.frames || gif.frames.length === 0) {
                console.warn(`Could not extract frames from GIF: ${file.name}`);
                continue;
            }
            const frame = gif.frames[0]; // Using only the first frame
            const { width, height } = frame.dims;

            const png = new PNG({ width, height });
            
            const patch = new Uint8ClampedArray(frame.patch);
            for(let i = 0; i < patch.length / 4; i++){
                png.data[i*4] = patch[i*4];
                png.data[i*4+1] = patch[i*4+1];
                png.data[i*4+2] = patch[i*4+2];
                png.data[i*4+3] = patch[i*4+3];
            }
            
            const pngBuffer = PNG.sync.write(png);
            image = await newPdf.embedPng(pngBuffer);
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
          for (const sheetName of workbook.SheetNames) {
              const sheet = workbook.Sheets[sheetName];
              const text = xlsx.utils.sheet_to_txt(sheet);
              fullText += `Sheet: ${sheetName}\n\n${text}\n\n`;
          }
          await addTextToPdf(newPdf, fullText);
      } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) { // .ppt, .pptx
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            let fullText = '';
            const slidePromises: Promise<void>[] = [];

            zip.folder('ppt/slides')?.forEach((relativePath, file) => {
              if (file.name.endsWith('.xml') && !file.name.includes('rels')) {
                  slidePromises.push(
                      file.async('text').then(content => {
                          const textNodes = content.match(/<a:t>.*?<\/a:t>/g) || [];
                          const slideText = textNodes.map(node => node.replace(/<a:t>(.*?)<\/a:t>/, '$1')).join(' ');
                          if (slideText.trim()) {
                            fullText += slideText + '\n\n';
                          }
                      })
                  );
              }
            });

            await Promise.all(slidePromises);
            if(fullText.trim()){
              await addTextToPdf(newPdf, fullText);
            } else {
              await addTextToPdf(newPdf, 'No text content could be extracted from this PowerPoint file.');
            }
          } catch(e) {
            await addTextToPdf(newPdf, 'PowerPoint to PDF conversion is limited. Only text from .pptx files is extracted. Formatting and images are not preserved.');
          }
      } else {
        console.warn(`Unsupported file type for conversion: ${fileType}`);
        return { success: false, error: `File type for "${file.name}" is not supported for conversion.`};
      }
    }

    if (newPdf.getPageCount() === 0) {
      return { success: false, error: 'Could not create a PDF. The file might be empty or unsupported.' };
    }

    const newPdfBytes = await newPdf.save();
    const newPdfBase64 = Buffer.from(newPdfBytes).toString('base64');

    return { success: true, downloadUrl: `data:application/pdf;base64,${newPdfBase64}` };

  } catch (error) {
    console.error(error);
    return { success: false, error: `Failed to convert files to PDF. Please ensure all files are valid and supported. Error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
