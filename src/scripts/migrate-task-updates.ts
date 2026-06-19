/**
 * Migration Script: Add taskUpdates array to existing tasks
 * 
 * This script migrates existing tasks that don't have taskUpdates array
 * by creating initial taskUpdates entries from their taskHistory and responses.
 * 
 * Run: npx tsx src/scripts/migrate-task-updates.ts
 */

import mongoose from 'mongoose';
import { Task } from '../models/Task';
import { User } from '../models/User';

async function migrate() {
  try {
    // Connect to database
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oxy-hr-pro';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all tasks without taskUpdates or with empty taskUpdates
    const tasks = await Task.find({
      $or: [
        { taskUpdates: { $exists: false } },
        { taskUpdates: { $size: 0 } }
      ]
    }).populate('assignedBy', 'firstName lastName');

    console.log(`📊 Found ${tasks.length} tasks to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const task of tasks) {
      try {
        const updates: any[] = [];

        // Create initial update from task creation
        if (task.taskHistory && task.taskHistory.length > 0) {
          // Sort by timestamp
          const sortedHistory = [...task.taskHistory].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Map taskHistory to taskUpdates
          for (const history of sortedHistory) {
            updates.push({
              status: mapActionToStatus(history.action),
              remark: history.remark,
              progress: estimateProgress(history.action, task.status),
              updatedBy: history.userId,
              createdAt: history.timestamp,
            });
          }
        }

        // If no history, create at least one entry from current status
        if (updates.length === 0) {
          updates.push({
            status: task.status,
            remark: task.latestRemark || 'Task migrated',
            progress: task.progress,
            updatedBy: task.assignedBy?._id || task.assignedTo?.[0] || new mongoose.Types.ObjectId(),
            createdAt: task.createdAt || new Date(),
          });
        }

        // Update task with taskUpdates
        task.taskUpdates = updates;
        await task.save();

        migrated++;
        console.log(`  ✓ Migrated: ${task.title} (${updates.length} updates)`);
      } catch (error) {
        skipped++;
        console.error(`  ✗ Failed to migrate task ${task._id}:`, error);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${tasks.length}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Helper function to map action to status
function mapActionToStatus(action: string): string {
  const actionMap: Record<string, string> = {
    'Assigned': 'Pending',
    'Accepted': 'To_Do',
    'Started': 'In_Progress',
    'Resumed': 'In_Progress',
    'Hold': 'On_Hold',
    'Completed': 'Completed',
    'Rejected': 'Rejected',
    'Progress Updated': 'In_Progress',
  };
  return actionMap[action] || 'Pending';
}

// Helper function to estimate progress based on action
function estimateProgress(action: string, currentStatus: string): number {
  if (currentStatus === 'Completed') return 100;
  if (currentStatus === 'On_Hold') return 50;
  if (action === 'Accepted') return 10;
  if (action === 'Started' || action === 'Resumed') return 25;
  if (action === 'Progress Updated') return 50;
  return 0;
}

// Run migration
migrate();