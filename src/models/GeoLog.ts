import { Schema, model, models, Document } from 'mongoose';

export interface IGeoLog extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  coordinates: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
}

const GeoLogSchema = new Schema<IGeoLog>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GeoLogSchema.index({ employee: 1, timestamp: -1 });

export const GeoLog = models.GeoLog || model<IGeoLog>('GeoLog', GeoLogSchema);
