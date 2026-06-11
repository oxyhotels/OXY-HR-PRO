import { Schema, model, models, Document } from 'mongoose';

export interface IPayroll extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  month: string; // Format: YYYY-MM
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
  status: 'Draft' | 'Paid';
  payslipPath?: string; // Local path or cloud URL to generated PDF payslip
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    month: { type: String, required: true }, // YYYY-MM
    baseSalary: { type: Number, required: true, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Paid'],
      default: 'Draft',
    },
    payslipPath: { type: String },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

// Unique compound index so that an employee only gets one payroll document per month
PayrollSchema.index({ employee: 1, month: 1 }, { unique: true });
PayrollSchema.index({ hotel: 1, month: 1 });

export const Payroll = models.Payroll || model<IPayroll>('Payroll', PayrollSchema);
