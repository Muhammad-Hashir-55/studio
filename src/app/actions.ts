'use server';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import bmp from 'bmp-js';
import { parse } from 'gifuct-js';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import JSZip from 'jszip';
import { PNG } from 'pngjs';
import fs from 'fs/promises';
import path from 'path';

let dejavuFont: Buffer | null = null;
async function getFont() {
  if (dejavuFont) {
    return dejavuFont;
  }
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf');
  try {
    dejavuFont = await fs.readFile(fontPath);
    return dejavuFont;
  } catch (error) {
    console.error('Failed to load font. Using standard font as fallback.', error);
    // Fallback or handle error appropriately
    return null;
  }
}


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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to merge PDFs. Please ensure all files are valid PDFs. Details: ${errorMessage}` };
  }
}

async function addTextToPdf(pdfDoc: PDFDocument, text: string) {
    const fontBytes = await getFont();
    const customFont = fontBytes ? await pdfDoc.embedFont(fontBytes, { subset: true }) : await pdfDoc.embedFont(StandardFonts.Helvetica);

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const lineHeight = 15;
    const margin = 50;
    const textWidth = width - 2 * margin;
    let y = height - margin;

    const lines = text.split('\n');
    for (const line of lines) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage();
          y = page.getHeight() - margin;
        }

        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
            const potentialLine = currentLine + (currentLine ? ' ' : '') + word;
            const currentWidth = customFont.widthOfTextAtSize(potentialLine, fontSize);

            if (currentWidth > textWidth) {
                page.drawText(currentLine, { x: margin, y, font: customFont, size: fontSize, color: rgb(0, 0, 0) });
                y -= lineHeight;
                currentLine = word;
                if (y < margin + lineHeight) {
                    page = pdfDoc.addPage();
                    y = page.getHeight() - margin;
                }
            } else {
                currentLine = potentialLine;
            }
        }
        
        page.drawText(currentLine, { x: margin, y, font: customFont, size: fontSize, color: rgb(0, 0, 0) });
        y -= lineHeight;
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
          png.data = bmpData.data;
          const pngBuffer = PNG.sync.write(png);
          image = await newPdf.embedPng(pngBuffer);
        } else if (fileType === 'image/gif') {
            const gif = parse(Buffer.from(arrayBuffer));
            if (!gif.frames || gif.frames.length === 0) {
                console.warn(`Could not extract frames from GIF: ${file.name}`);
                continue;
            }
            
            for (const frame of gif.frames) {
                const patch = frame.patch;
                const png = new PNG({ width: patch.width, height: patch.height });
                
                const rgba = new Uint8ClampedArray(patch.width * patch.height * 4);
                let patchIdx = 0;
                for (let i = 0; i < frame.pixels.length; i++) {
                    const colorIndex = frame.pixels[i];
                    if (colorIndex === frame.transparentIndex) {
                        const idx = patchIdx * 4;
                        rgba[idx] = 0;
                        rgba[idx+1] = 0;
                        rgba[idx+2] = 0;
                        rgba[idx+3] = 0; // transparent
                    } else {
                        const color = gif.colorTable[colorIndex];
                        if (color) {
                            const idx = patchIdx * 4;
                            rgba[idx] = color[0];
                            rgba[idx+1] = color[1];
                            rgba[idx+2] = color[2];
                            rgba[idx+3] = 255; // Opaque
                        }
                    }
                    patchIdx++;
                }
                
                png.data = Buffer.from(rgba);
                const pngBuffer = PNG.sync.write(png);
                const embeddedImage = await newPdf.embedPng(pngBuffer);
                const page = newPdf.addPage([frame.dims.width, frame.dims.height]);
                page.drawImage(embeddedImage, { x: frame.dims.left, y: page.getHeight() - frame.dims.top - patch.height, width: patch.width, height: patch.height });
            }
            continue;
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
      } else if (fileType.includes('word')) {
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          await addTextToPdf(newPdf, value);
      } else if (fileType.includes('excel') || fileType.includes('spreadsheetml.sheet')) {
          const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
          let fullText = '';
          for (const sheetName of workbook.SheetNames) {
              const sheet = workbook.Sheets[sheetName];
              const text = xlsx.utils.sheet_to_txt(sheet);
              fullText += `Sheet: ${sheetName}\n\n${text}\n\n`;
          }
          await addTextToPdf(newPdf, fullText);
      } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            let fullText = '';
            const slidePromises: Promise<void>[] = [];
            const slideFiles: { [key: string]: JSZip.JSZipObject } = {};

            zip.folder('ppt/slides')?.forEach((relativePath, file) => {
              if (file.name.endsWith('.xml') && !file.name.includes('rels')) {
                const slideNum = parseInt(file.name.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
                slideFiles[slideNum] = file;
              }
            });

            const sortedSlideKeys = Object.keys(slideFiles).sort((a,b) => parseInt(a) - parseInt(b));

            for(const key of sortedSlideKeys){
              const content = await slideFiles[key].async('text');
              const textNodes = content.match(/<a:t>.*?<\/a:t>/g) || [];
              const slideText = textNodes.map(node => node.replace(/<.*?>/g, '')).join(' ');
              if (slideText.trim()) {
                fullText += `Slide ${key}\n\n${slideText}\n\n`;
              }
            }

            if(fullText.trim()){
              await addTextToPdf(newPdf, fullText);
            } else {
              await addTextToPdf(newPdf, 'No text content could be extracted from this PowerPoint file.');
            }
          } catch(e) {
            await addTextToPdf(newPdf, 'PowerPoint to PDF conversion is limited. Only text from .pptx files is extracted. Formatting and images are not preserved.');
          }
      } else {
        console.warn(`Unsupported file type for conversion: ${file.name} (${fileType})`);
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
    console.error('Conversion Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to convert files to PDF. Details: ${errorMessage}` };
  }
}

// This function will be called from next.config.js
export async function downloadFont() {
  const fontUrl = 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf';
  const fontDir = path.join(process.cwd(), 'public', 'fonts');
  const fontPath = path.join(fontDir, 'DejaVuSans.ttf');
  
  try {
      await fs.access(fontDir);
  } catch (error) {
      await fs.mkdir(fontDir, { recursive: true });
  }

  try {
    // Check if font already exists
    await fs.access(fontPath);
    console.log('Font already exists. Skipping download.');
    return;
  } catch (error) {
    // Font does not exist, download it
    console.log('Downloading DejaVuSans font...');
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(fontUrl);
    if (!response.ok) {
        throw new Error(`Failed to download font: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(fontPath, Buffer.from(arrayBuffer));
    console.log('Font downloaded successfully.');
  }
}
