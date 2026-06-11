import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface PayslipData {
  hotelName: string;
  hotelAddress: string;
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  designation: string;
  department: string;
  month: string;
  baseSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
}

export const generatePayslipPDF = (data: PayslipData, outputPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Ensure output folder exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    // --- Header ---
    doc.fillColor('#D4AF37').fontSize(24).text('OXY-HR PRO', { align: 'right' });
    doc.fillColor('#1A202C').fontSize(14).text(data.hotelName, 50, 50);
    doc.fontSize(10).fillColor('#718096').text(data.hotelAddress, 50, 70);
    doc.moveDown(2);

    // Title
    doc.fillColor('#1A202C').fontSize(18).text(`PAYSLIP FOR ${data.month.toUpperCase()}`, { align: 'center' });
    doc.moveDown();

    // Divider Line
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // --- Employee Info Grid ---
    const gridY = doc.y;
    doc.fontSize(10).fillColor('#4A5568');
    
    // Left Column
    doc.text(`Employee ID: ${data.employeeId}`, 50, gridY);
    doc.text(`Name: ${data.employeeName}`, 50, gridY + 20);
    doc.text(`Email: ${data.employeeEmail}`, 50, gridY + 40);

    // Right Column
    doc.text(`Department: ${data.department}`, 350, gridY);
    doc.text(`Designation: ${data.designation}`, 350, gridY + 20);
    doc.text(`Salary Period: ${data.month}`, 350, gridY + 40);
    doc.moveDown(5);

    // Divider
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // --- Salary Table ---
    const tableY = doc.y;
    
    // Table Headers
    doc.font('Helvetica-Bold').fillColor('#1A202C');
    doc.text('Description', 50, tableY);
    doc.text('Earnings', 300, tableY, { align: 'right', width: 100 });
    doc.text('Deductions', 450, tableY, { align: 'right', width: 100 });
    doc.font('Helvetica').fillColor('#4A5568');

    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();
    doc.moveDown(1.5);

    let currentY = doc.y;

    // Basic Salary
    doc.text('Basic Salary', 50, currentY);
    doc.text(`Rs. ${data.baseSalary.toFixed(2)}`, 300, currentY, { align: 'right', width: 100 });
    currentY += 20;

    // Overtime
    if (data.overtimeHours > 0) {
      doc.text(`Overtime (${data.overtimeHours} hrs)`, 50, currentY);
      doc.text(`Rs. ${data.overtimePay.toFixed(2)}`, 300, currentY, { align: 'right', width: 100 });
      currentY += 20;
    }

    // Bonus
    if (data.bonus > 0) {
      doc.text('Performance Bonus', 50, currentY);
      doc.text(`Rs. ${data.bonus.toFixed(2)}`, 300, currentY, { align: 'right', width: 100 });
      currentY += 20;
    }

    // Allowances
    data.allowances.forEach((item) => {
      doc.text(item.name, 50, currentY);
      doc.text(`Rs. ${item.amount.toFixed(2)}`, 300, currentY, { align: 'right', width: 100 });
      currentY += 20;
    });

    // Reset Y for deductions to display on the right side
    let deductionY = doc.y - (data.allowances.length * 20) - 20;
    if (data.overtimeHours > 0) deductionY -= 20;
    if (data.bonus > 0) deductionY -= 20;
    // Align with initial items
    deductionY = Math.max(deductionY, tableY + 25);

    data.deductions.forEach((item) => {
      doc.text(item.name, 50, deductionY); // List on left column but specify deduct amount on right
      doc.text(`Rs. ${item.amount.toFixed(2)}`, 450, deductionY, { align: 'right', width: 100 });
      deductionY += 20;
    });

    // Make Y reflect the maximum of earnings or deductions rows
    currentY = Math.max(currentY, deductionY);
    doc.moveDown(2);

    // Divider
    doc.strokeColor('#1A202C').lineWidth(1.5).moveTo(50, currentY).lineTo(550, currentY).stroke();
    
    // Net Salary Block
    currentY += 15;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A202C');
    doc.text('NET SALARY (INR):', 50, currentY);
    doc.fillColor('#D4AF37').text(`Rs. ${data.netSalary.toFixed(2)}`, 400, currentY, { align: 'right', width: 150 });
    
    doc.fontSize(10).font('Helvetica').fillColor('#718096');
    currentY += 25;
    doc.text('This is a system generated document and does not require a physical signature.', 50, currentY, { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      resolve(outputPath);
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
};
