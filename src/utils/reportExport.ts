'use client';

import ExcelJS from 'exceljs';

// Helper to determine if checkout was early (before 16:45 / 4:45 PM)
export const checkEarlyCheckout = (checkOutStr?: string | Date): boolean => {
  if (!checkOutStr) return false;
  const d = new Date(checkOutStr);
  return d.getHours() < 16 || (d.getHours() === 16 && d.getMinutes() < 45);
};

// Format Date / Time strings helper
export const formatTime = (dateStr?: string | Date): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return 'N/A';
  }
};

// Export to CSV
export const exportToCSV = (logs: any[], fileName: string = 'attendance_report.csv') => {
  const headers = [
    'Employee Name',
    'Employee ID',
    'Date',
    'Status',
    'Check-In Time',
    'Check-Out Time',
    'Working Hours',
    'Break Minutes',
    'Late Check-In',
    'Early Check-Out',
    'GPS In (Lat/Lng)',
    'GPS Out (Lat/Lng)',
    'Check-In Selfie',
    'Check-Out Selfie',
    'Work Description'
  ];

  const rows = logs.map(log => {
    const empName = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'N/A';
    const empId = log.employee?.employeeId || 'N/A';
    const date = log.date || '';
    const status = log.status || 'N/A';
    const checkIn = formatTime(log.checkIn);
    const checkOut = log.checkOut ? formatTime(log.checkOut) : 'N/A';
    const workingHours = log.totalWorkingHours !== undefined ? log.totalWorkingHours.toFixed(2) : '0.00';
    const breakMins = log.totalBreakMinutes !== undefined ? log.totalBreakMinutes : '0';
    const late = log.status === 'Late' ? 'Yes' : 'No';
    const early = checkEarlyCheckout(log.checkOut) ? 'Yes' : 'No';

    const gpsIn = log.checkInLatitude ? `"${log.checkInLatitude}, ${log.checkInLongitude}"` : 'N/A';
    const gpsOut = log.checkOutLatitude ? `"${log.checkOutLatitude}, ${log.checkOutLongitude}"` : 'N/A';

    const selfieIn = (log.checkInPhoto || log.selfieUrl) ? 'Provided' : 'Missing';
    const selfieOut = log.checkOutPhoto ? 'Provided' : 'Missing';
    const workDesc = log.workDescription ? `"${log.workDescription.replace(/"/g, '""')}"` : 'N/A';

    return [
      empName,
      empId,
      date,
      status,
      checkIn,
      checkOut,
      workingHours,
      breakMins,
      late,
      early,
      gpsIn,
      gpsOut,
      selfieIn,
      selfieOut,
      workDesc
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export to Excel using ExcelJS
export const exportToExcel = async (logs: any[], title: string, fileName: string = 'attendance_report.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Title Block
  worksheet.mergeCells('A1:O2');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFD700' } }; // Gold color
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Dark Slate
  };

  // Meta row
  worksheet.mergeCells('A3:O3');
  const metaCell = worksheet.getCell('A3');
  metaCell.value = `Exported on: ${new Date().toLocaleString()} | Total Records: ${logs.length}`;
  metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };

  // Empty spacer row
  worksheet.addRow([]);

  // Headers row
  const headers = [
    'Employee Name',
    'Employee ID',
    'Date',
    'Status',
    'Check-In Time',
    'Check-Out Time',
    'Working Hours',
    'Break Minutes',
    'Late Check-In',
    'Early Check-Out',
    'GPS Check-In',
    'GPS Check-Out',
    'Selfie In',
    'Selfie Out',
    'Duty Description'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FFFFD700' } }, // Gold Accent
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  headerRow.height = 25;

  // Add Data
  logs.forEach(log => {
    const empName = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'N/A';
    const empId = log.employee?.employeeId || 'N/A';
    const date = log.date || '';
    const status = log.status || 'N/A';
    const checkIn = formatTime(log.checkIn);
    const checkOut = log.checkOut ? formatTime(log.checkOut) : 'N/A';
    const workingHours = log.totalWorkingHours !== undefined ? Number(log.totalWorkingHours.toFixed(2)) : 0;
    const breakMins = log.totalBreakMinutes !== undefined ? Number(log.totalBreakMinutes) : 0;
    const late = log.status === 'Late' ? 'Yes' : 'No';
    const early = checkEarlyCheckout(log.checkOut) ? 'Yes' : 'No';

    const gpsIn = log.checkInLatitude ? `${log.checkInLatitude}, ${log.checkInLongitude}` : 'N/A';
    const gpsOut = log.checkOutLatitude ? `${log.checkOutLatitude}, ${log.checkOutLongitude}` : 'N/A';

    const selfieIn = (log.checkInPhoto || log.selfieUrl) ? 'Provided' : 'Missing';
    const selfieOut = log.checkOutPhoto ? 'Provided' : 'Missing';
    const workDesc = log.workDescription || 'N/A';

    const dataRow = worksheet.addRow([
      empName,
      empId,
      date,
      status,
      checkIn,
      checkOut,
      workingHours,
      breakMins,
      late,
      early,
      gpsIn,
      gpsOut,
      selfieIn,
      selfieOut,
      workDesc
    ]);

    // Alignments & status highlight
    dataRow.eachCell((cell, colIndex) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (colIndex === 4) { // Status column
        cell.alignment = { horizontal: 'center' };
        if (status === 'Absent') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFEF4444' } }; // Red
        } else if (status === 'Late') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFF59E0B' } }; // Yellow
        } else if (status === 'Half-Day') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF3B82F6' } }; // Blue
        } else {
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF10B981' } }; // Green
        }
      } else if ([3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(colIndex)) {
        cell.alignment = { horizontal: 'center' };
      } else {
        cell.alignment = { horizontal: 'left' };
      }
    });

    dataRow.height = 20;
  });

  // Auto column sizing
  worksheet.columns.forEach((column: any) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell: any) => {
      const columnLength = cell.value ? String(cell.value).length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(30, Math.max(maxLength + 3, 12));
  });

  // Build spreadsheet file download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Export to PDF using jsPDF + jspdf-autotable
export const exportToPDF = async (logs: any[], title: string, fileName: string = 'attendance_report.pdf') => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'l', // Landscape to accommodate 10 columns
    unit: 'mm',
    format: 'a4'
  });

  // Title block banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, 'F');

  // Title text
  doc.setTextColor(255, 215, 0); // Gold Accent
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 12);

  // Subtitle/Metadata
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Total Logs Count: ${logs.length}`, 14, 19);

  const tableHeaders = [
    ['Emp Name', 'Emp ID', 'Date', 'Status', 'In', 'Out', 'Hours', 'Late', 'Early', 'Duty Details']
  ];

  const tableBody = logs.map(log => {
    const empName = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'N/A';
    const empId = log.employee?.employeeId || 'N/A';
    const date = log.date || '';
    const status = log.status || 'N/A';
    const checkIn = formatTime(log.checkIn);
    const checkOut = log.checkOut ? formatTime(log.checkOut) : 'N/A';
    const workingHours = log.totalWorkingHours !== undefined ? log.totalWorkingHours.toFixed(2) : '0.00';
    const late = log.status === 'Late' ? 'Yes' : 'No';
    const early = checkEarlyCheckout(log.checkOut) ? 'Yes' : 'No';
    const workDesc = log.workDescription || 'N/A';

    return [
      empName,
      empId,
      date,
      status,
      checkIn,
      checkOut,
      workingHours,
      late,
      early,
      workDesc.length > 45 ? `${workDesc.substring(0, 42)}...` : workDesc
    ];
  });

  // Render high fidelity autoTable
  autoTable(doc, {
    startY: 28,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      font: 'helvetica',
      cellPadding: 2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [71, 85, 105],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Emp Name
      1: { cellWidth: 20, halign: 'center' }, // Emp ID
      2: { cellWidth: 22, halign: 'center' }, // Date
      3: { cellWidth: 18, halign: 'center' }, // Status
      4: { cellWidth: 18, halign: 'center' }, // In
      5: { cellWidth: 18, halign: 'center' }, // Out
      6: { cellWidth: 15, halign: 'center' }, // Hours
      7: { cellWidth: 12, halign: 'center' }, // Late
      8: { cellWidth: 12, halign: 'center' }, // Early
      9: { cellWidth: 'auto' } // Description
    },
    didParseCell: (data) => {
      // Color-code the status values
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw;
        if (val === 'Absent') {
          data.cell.styles.textColor = [239, 68, 68]; // red-500
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Late') {
          data.cell.styles.textColor = [245, 158, 11]; // amber-500
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Half-Day') {
          data.cell.styles.textColor = [59, 130, 246]; // blue-500
        } else {
          data.cell.styles.textColor = [16, 185, 129]; // emerald-500
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  // Download PDF
  doc.save(fileName);
};
