import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const backfill = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const PropertyReport = mongoose.connection.collection('propertyreports');
    
    // Find reports without reportDate
    const missing = await PropertyReport.find({ reportDate: { $exists: false } }).toArray();
    console.log(`Found ${missing.length} reports missing reportDate.`);

    let updated = 0;
    for (const report of missing) {
      await PropertyReport.updateOne(
        { _id: report._id },
        { $set: { reportDate: report.createdAt || new Date(), uploadedAt: report.createdAt || new Date(), deleteStatus: 'ACTIVE' } }
      );
      updated++;
    }

    console.log(`Successfully updated ${updated} reports.`);
    
    // Drop old indexes if they exist
    try { await PropertyReport.dropIndex('hotelId_1_category_1'); } catch(e) {}
    try { await PropertyReport.dropIndex('createdAt_-1'); } catch(e) {}

    await PropertyReport.createIndex({ hotelId: 1, reportDate: -1 });
    await PropertyReport.createIndex({ reportDate: -1, uploadedAt: -1 });

    console.log('Indexes updated successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed', error);
    process.exit(1);
  }
};

backfill();
