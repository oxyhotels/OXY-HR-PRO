'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import GoogleIcon from '@/components/GoogleIcon';
import ReportUploaderModal from '@/components/property/ReportUploaderModal';
import ReportViewer from '@/components/property/ReportViewer';

const CATEGORIES = [
  { id: 'DAILY_SALES_REPORT', name: 'Daily Sales Report', icon: 'receipt_long', color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'CASHBOOK', name: 'Cashbook', icon: 'account_balance_wallet', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'POLICE_REPORT', name: 'Police Report', icon: 'local_police', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'AD_PHOTO', name: 'A&D Photos', icon: 'collections', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'METER_READING_PHOTO', name: 'Meter Reading Photos', icon: 'electric_meter', color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

export default function PropertyReportsTab() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [viewCategory, setViewCategory] = useState<string | null>(null);

  // Filters for Admin
  const [filterHotelId, setFilterHotelId] = useState('');
  const [hotels, setHotels] = useState<any[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = '/property-reports?';
      if (filterHotelId) {
        url += `hotelId=${filterHotelId}`;
      }
      const res = await api.get(url);
      setReports(res?.reports || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotels = async () => {
    try {
      const res = await api.get('/hotels/public');
      let availableHotels = res.data.hotels || res.data.data?.hotels || [];
      if (user?.role !== 'ROOT_ADMIN' && user?.hotel) {
        availableHotels = availableHotels.filter((h: any) => h._id === user.hotel);
      }
      setHotels(availableHotels);
      
      // Auto-select for non-admin or if only one hotel available
      if (availableHotels.length > 0 && !filterHotelId) {
        setFilterHotelId(availableHotels[0]._id);
      }
    } catch (err) {
      console.error('Failed to load hotels', err);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filterHotelId]);

  const handleUploadSubmit = async (payload: any) => {
    try {
      const selectedHotel = hotels.find(h => h._id === filterHotelId);
      if (!selectedHotel) {
        alert("⚠ Please select a Property before uploading any report.");
        return;
      }

      const finalPayload = {
        ...payload,
        hotelId: selectedHotel._id,
        hotelName: selectedHotel.name,
        hotelCode: selectedHotel.hotelCode,
        reportType: payload.category,
        uploadedBy: (user as any)?._id || user?.id,
        uploadedByRole: user?.role,
        department: user?.department || 'GENERAL',
      };

      await api.post('/property-reports', finalPayload);
      await fetchReports();
      alert("✅ Upload successful!");
    } catch (err: any) {
      console.error('Error submitting report:', err);
      alert(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
      throw err;
    }
  };

  const openUploadModal = (catId: string) => {
    if (!filterHotelId) {
      alert("⚠ Please select a Property before uploading any report.");
      return;
    }
    setUploadCategory(catId);
  };

  // Group reports by category for counts
  const categoryStats = CATEGORIES.map(cat => {
    const catReports = reports.filter(r => r.category === cat.id);
    const lastUpload = catReports.length > 0 ? catReports[0].createdAt : null;
    return {
      ...cat,
      count: catReports.length,
      lastUpload,
    };
  });

  const getFilteredReportsForViewer = () => {
    return reports.filter(r => r.category === viewCategory);
  };

  return (
    <div className="mt-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <GoogleIcon name="folder_open" size={28} className="text-gold" />
          Property Daily Operations
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Manage and view daily operational reports, cashbooks, and verification photos.
        </p>
      </div>

      <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4">
        <label className="text-sm font-semibold text-slate-300">Filter by Property:</label>
        <select
          value={filterHotelId}
          onChange={(e) => setFilterHotelId(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:border-gold outline-none min-w-[250px]"
        >
          {user?.role === 'ROOT_ADMIN' && <option value="">All Properties</option>}
          {hotels.map(h => (
            <option key={h._id} value={h._id}>{h.name}</option>
          ))}
        </select>
        <button onClick={fetchReports} className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-gold flex items-center justify-center transition-colors">
          <GoogleIcon name="refresh" size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading documents...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryStats.map((cat) => (
            <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all group flex flex-col h-full">
              
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.bg} ${cat.color}`}>
                  <GoogleIcon name={cat.icon} size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-white leading-none">{cat.count}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Uploads</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold transition-colors">{cat.name}</h3>
              <p className="text-xs text-slate-400 mb-6 flex-1">
                {cat.lastUpload ? (
                  <>Last upload: {new Date(cat.lastUpload).toLocaleDateString()}</>
                ) : (
                  'No uploads yet'
                )}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                  onClick={() => openUploadModal(cat.id)}
                  className="py-2.5 rounded-lg bg-gold hover:bg-gold-light text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GoogleIcon name="upload" size={16} />
                  Upload
                </button>
                <button
                  onClick={() => setViewCategory(cat.id)}
                  className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GoogleIcon name="visibility" size={16} />
                  View Files
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadCategory && (
        <ReportUploaderModal
          category={uploadCategory}
          onClose={() => setUploadCategory(null)}
          onSubmit={handleUploadSubmit}
        />
      )}

      {viewCategory && (
        <ReportViewer
          category={viewCategory}
          reports={getFilteredReportsForViewer()}
          userRole={user?.role || ''}
          onRefresh={fetchReports}
          onClose={() => setViewCategory(null)}
        />
      )}
    </div>
  );
}
