import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateInvoice = async (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '../invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice-${invoiceData.invoiceNumber}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20)
        .text('INVOICE', 50, 50, { align: 'center' })
        .fontSize(10)
        .text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, 100)
        .text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`, 50, 115);

      // Customer Info
      doc.fontSize(12)
        .text('Bill To:', 50, 150)
        .fontSize(10)
        .text(invoiceData.user.name || 'N/A', 50, 170)
        .text(invoiceData.user.email || 'N/A', 50, 185);

      // Line
      doc.moveTo(50, 220)
        .lineTo(550, 220)
        .stroke();

      // Table Header
      doc.fontSize(10)
        .text('Description', 50, 240)
        .text('Amount', 450, 240);

      doc.moveTo(50, 260)
        .lineTo(550, 260)
        .stroke();

      // Table Content
      const duration = invoiceData.plan === 'YEARLY' ? '365 days' : '30 days';
      doc.text(`${invoiceData.plan} Plan Subscription (${duration})`, 50, 280)
        .text(`₹${invoiceData.amount}`, 450, 280);

      doc.moveTo(50, 310)
        .lineTo(550, 310)
        .stroke();

      // Total
      doc.fontSize(12)
        .text('Total Amount:', 350, 330)
        .text(`₹${invoiceData.amount}`, 450, 330);

      // Payment Details
      doc.fontSize(10)
        .text('Payment Details:', 50, 370)
        .text(`Payment ID: ${invoiceData.paymentId}`, 50, 390)
        .text(`Order ID: ${invoiceData.orderId}`, 50, 405)
        .text('Payment Status: SUCCESS', 50, 420);

      // Footer
      doc.fontSize(8)
        .text('Thank you for your business!', 50, 500, { align: 'center' })
        .text('YouTube Clone - All Rights Reserved', 50, 515, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log('✅ Invoice generated:', filepath);
        resolve(filepath);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};