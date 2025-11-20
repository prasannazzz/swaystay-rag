import { UploadedFile } from '../types';

// We declare the global window object to access the PDF.js library loaded via CDN in index.html
// This avoids complex build configuration for pdf.worker.js in this specific environment
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const extractTextFromPdf = async (file: File): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        
        // Set worker source explicitly to ensure it works without bundler magic
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        } else {
          throw new Error("PDF.js library not loaded");
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;

        let fullText = '';
        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => item.str)
            .join(' ');
          fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        resolve({
          name: file.name,
          content: fullText,
          size: file.size,
          pageCount: totalPages,
        });

      } catch (error) {
        console.error("Error parsing PDF:", error);
        reject(new Error("Failed to extract text from PDF. Please ensure it is a valid PDF file."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };

    reader.readAsArrayBuffer(file);
  });
};