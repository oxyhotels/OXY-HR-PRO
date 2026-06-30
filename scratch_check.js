const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

// Force DNS lookup to prefer IPv4 globally to prevent [64:ff9b::...] IPv6/NAT64 timeouts
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
// Set public DNS servers
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

// Define Schema
const PropertyReportSchema = new mongoose.Schema({
  hotelId: mongoose.Schema.Types.ObjectId,
  hotelName: String,
  category: String,
  reportType: String,
  reportDate: Date,
  deleteStatus: String,
  files: Array
}, { strict: false });

const PropertyReport = mongoose.model('PropertyReport', PropertyReportSchema, 'propertyreports');

async function main() {
  console.log('Connecting to:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const hotelId = '6a2d3dbfb61c607b22dd490e';
  const category = 'DAILY_SALES_REPORT';
  const reportDate = '2026-06-28';

  const dateObj = new Date(reportDate);
  const nextDay = new Date(dateObj);
  nextDay.setDate(nextDay.getDate() + 1);

  const query = {
    hotelId: new mongoose.Types.ObjectId(hotelId),
    category,
    reportDate: { $gte: dateObj, $lt: nextDay },
    deleteStatus: { $ne: 'DELETED' }
  };

  console.log('Running query with select("-files.fileUrl"):', JSON.stringify(query, null, 2));

  let start = Date.now();
  const reports = await PropertyReport.find(query).select('-files.fileUrl').lean();
  console.log(`Query finished in ${Date.now() - start} ms. Found: ${reports.length} reports.`);

  reports.forEach(r => {
    console.log(`Report ID: ${r._id} | Date: ${r.reportDate} | Files Count: ${r.files?.length}`);
    if (r.files) {
      r.files.forEach((f, i) => {
        console.log(`  File ${i+1}: Name: "${f.fileName}" | Url exists: ${!!f.fileUrl}`);
      });
    }
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
