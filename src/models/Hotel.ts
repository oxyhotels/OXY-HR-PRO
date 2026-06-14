import { Schema, model, models, Document } from 'mongoose';

export interface IHotel extends Document {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  status: 'Active' | 'Suspended';
  subscriptionPlan: 'Standard' | 'Premium' | 'Enterprise';
  logoUrl?: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number; // in meters
  createdAt: Date;
  updatedAt: Date;
}

const HotelSchema = new Schema<IHotel>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, required: true },
    },
    status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
    subscriptionPlan: { type: String, enum: ['Standard', 'Premium', 'Enterprise'], default: 'Standard' },
    logoUrl: { type: String },
    latitude: { type: Number, default: 25.79065 }, // default Miami South Beach lat
    longitude: { type: Number, default: -80.130045 }, // default Miami South Beach lng
    geofenceRadius: { type: Number, default: 200 }, // geofencing boundary radius in meters
  },
  { timestamps: true }
);

export const Hotel = models.Hotel || model<IHotel>('Hotel', HotelSchema);
