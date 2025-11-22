const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');
const Sale = require('../models/Sale');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Helper function to generate invoice number
const generateInvoiceNumber = async () => {
  const result = await query(
    `SELECT setting_value FROM settings WHERE setting_key = 'invoice_prefix'`
  );
  const prefix = result.rows[0]?.setting_value || 'INV';
  const year = new Date().getFullYear();
  
  // Get the last invoice number for this year
  const lastInvoice = await query(
    `SELECT invoice_number FROM invoices 
     WHERE invoice_number LIKE $1 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}-${year}-%`]
  );

  let sequence = 1;
  if (lastInvoice.rows.length > 0) {
    const lastNumber = lastInvoice.rows[0].invoice_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
};

// Helper function to generate PDF invoice
const generateInvoicePDF = async (invoice, sale) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create uploads/invoices directory if it doesn't exist
      const invoiceDir = path.join(__dirname, '../../uploads/invoices');
      await fs.mkdir(invoiceDir, { recursive: true });

      const filename = `invoice-${invoice.invoice_number}.pdf`;
      const filepath = path.join(invoiceDir, filename);

      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = require('fs').createWriteStream(filepath);

      doc.pipe(stream);

      // Get company info from settings
      const companyInfo = await query(
        `SELECT setting_key, setting_value FROM settings 
         WHERE setting_key IN ('company_name', 'company_address')`
      );
      
      const settings = {};
      companyInfo.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });

      const companyName = settings.company_name || 'AfroGazette Media & Advertising';
      const companyAddress = settings.company_address || 'Harare, Zimbabwe';

      // Header - Company Logo/Name
      doc.fontSize(24)
         .fillColor('#dc2626')
         .text('AFROGAZETTE', 50, 50);
      
      doc.fontSize(12)
         .fillColor('#000000')
         .text('Media & Advertising', 50, 80);

      // Company Address
      doc.fontSize(9)
         .fillColor('#666666')
         .text(companyAddress, 50, 100, { width: 250 });

      // Invoice Title and Number
      doc.fontSize(20)
         .fillColor('#000000')
         .text('INVOICE', 400, 50, { align: 'right' });

      doc.fontSize(10)
         .fillColor('#666666')
         .text(`#${invoice.invoice_number}`, 400, 80, { align: 'right' });

      doc.text(`Date: ${new Date(invoice.generated_at).toLocaleDateString()}`, 400, 100, { align: 'right' });

      // Horizontal line
      doc.moveTo(50, 160)
         .lineTo(550, 160)
         .strokeColor('#dc2626')
         .lineWidth(2)
         .stroke();

      // Bill To section
      doc.fontSize(12)
         .fillColor('#000000')
         .text('Bill To:', 50, 180);

      doc.fontSize(10)
         .fillColor('#666666')
         .text(invoice.client_name, 50, 200)
         .text(`Phone: ${invoice.client_phone || 'N/A'}`, 50, 215);

      // Payment Details
      doc.fontSize(12)
         .fillColor('#000000')
         .text('Payment Details:', 350, 180);

      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Method: ${invoice.payment_method}`, 350, 200)
         .text(`Date: ${new Date(invoice.payment_date).toLocaleDateString()}`, 350, 215)
         .text(`Ad Type: ${invoice.ad_type || 'N/A'}`, 350, 230);

      // Table Header
      const tableTop = 280;
      doc.fontSize(11)
         .fillColor('#ffffff')
         .rect(50, tableTop, 500, 25)
         .fillAndStroke('#dc2626', '#dc2626');

      doc.fillColor('#ffffff')
         .text('Description', 60, tableTop + 7, { width: 300 })
         .text('Amount', 450, tableTop + 7, { width: 90, align: 'right' });

      // Table Content
      doc.fontSize(10)
         .fillColor('#000000')
         .text(invoice.description || 'Advertising Service', 60, tableTop + 40, { width: 300 })
         .text(`$${parseFloat(invoice.amount).toFixed(2)}`, 450, tableTop + 40, { width: 90, align: 'right' });

      // Horizontal line
      doc.moveTo(50, tableTop + 70)
         .lineTo(550, tableTop + 70)
         .strokeColor('#cccccc')
         .lineWidth(1)
         .stroke();

      // Total
      doc.fontSize(14)
         .fillColor('#000000')
         .text('TOTAL', 350, tableTop + 85)
         .text(`$${parseFloat(invoice.amount).toFixed(2)}`, 450, tableTop + 85, { width: 90, align: 'right' });

      // Footer
      doc.fontSize(9)
         .fillColor('#666666')
         .text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

      doc.text('For inquiries, please contact us at the address above.', 50, 715, { align: 'center', width: 500 });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(`/uploads/invoices/${filename}`);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Get all invoices
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.*,
        u.first_name || ' ' || u.last_name as generated_by_name
       FROM invoices i
       LEFT JOIN users u ON i.generated_by = u.id
       ORDER BY i.generated_at DESC`
    );

    res.json({ invoices: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get invoice by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT i.*,
        u.first_name || ' ' || u.last_name as generated_by_name
       FROM invoices i
       LEFT JOIN users u ON i.generated_by = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Generate invoice for a sale (Admin only)
router.post('/generate/:saleId', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { saleId } = req.params;

    // Check if sale exists and is approved
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved sales can have invoices generated' });
    }

    // Check if invoice already exists for this sale
    const existingInvoice = await query(
      'SELECT id FROM invoices WHERE sale_id = $1',
      [saleId]
    );

    if (existingInvoice.rows.length > 0) {
      return res.status(400).json({ error: 'Invoice already exists for this sale' });
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice record
    const invoiceResult = await query(
      `INSERT INTO invoices (
        sale_id, invoice_number, client_name, client_phone, amount,
        payment_method, payment_date, ad_type, description, generated_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        saleId,
        invoiceNumber,
        sale.client_name,
        sale.client_phone,
        sale.amount,
        sale.payment_method,
        sale.payment_date,
        sale.ad_type,
        sale.description,
        req.user.userId
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Generate PDF
    const pdfPath = await generateInvoicePDF(invoice, sale);

    // Update invoice with PDF path
    await query(
      'UPDATE invoices SET pdf_path = $1 WHERE id = $2',
      [pdfPath, invoice.id]
    );

    invoice.pdf_path = pdfPath;

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error) {
    next(error);
  }
});

// Download invoice PDF
router.get('/:id/download', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT invoice_number, pdf_path FROM invoices WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];
    
    if (!invoice.pdf_path) {
      return res.status(404).json({ error: 'PDF not available for this invoice' });
    }

    const filepath = path.join(__dirname, '../..', invoice.pdf_path);

    try {
      await fs.access(filepath);
      res.download(filepath, `${invoice.invoice_number}.pdf`);
    } catch (error) {
      return res.status(404).json({ error: 'PDF file not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Delete invoice (Admin only)
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get invoice to delete PDF file
    const result = await query(
      'SELECT pdf_path FROM invoices WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    // Delete PDF file if exists
    if (invoice.pdf_path) {
      const filepath = path.join(__dirname, '../..', invoice.pdf_path);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.error('Error deleting PDF file:', error);
      }
    }

    // Delete invoice record
    await query('DELETE FROM invoices WHERE id = $1', [id]);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
