/**
 * Chargement des polices pour le PDF Fleet-Master
 * Charge Inter (OTF) via fontkit, avec fallback sur Helvetica
 */

import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

export async function loadFonts(pdfDoc: PDFDocument): Promise<FontSet> {
  try {
    // Tentative de chargement via fontkit + Inter OTF
    const fontkit = await import('@pdf-lib/fontkit');
    pdfDoc.registerFontkit(fontkit.default ?? fontkit);

    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const regularPath = path.join(fontsDir, 'Inter-Regular.otf');
    const boldPath = path.join(fontsDir, 'Inter-Bold.otf');
    const italicPath = path.join(fontsDir, 'Inter-Italic.otf');

    if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
      const [regularBytes, boldBytes, italicBytes] = await Promise.all([
        fs.promises.readFile(regularPath),
        fs.promises.readFile(boldPath),
        fs.existsSync(italicPath) ? fs.promises.readFile(italicPath) : null,
      ]);

      const regular = await pdfDoc.embedFont(regularBytes);
      const bold = await pdfDoc.embedFont(boldBytes);
      const italic = italicBytes
        ? await pdfDoc.embedFont(italicBytes)
        : regular;

      return { regular, bold, italic };
    }
  } catch {
    // fontkit absent ou polices manquantes → fallback Helvetica
  }

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  return { regular, bold, italic };
}
