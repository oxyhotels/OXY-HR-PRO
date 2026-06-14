'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Plus, Edit2, Trash2, ShieldAlert, Check, X, Loader2, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface HotelData {
  _id: string;
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
  googleLocationLink?: string;
  status: 'Active' | 'Suspended';
  subscriptionPlan: 'Standard' | 'Premium' | 'Enterprise';
}

export default function HotelsPage() {
  const { user } = useAuthStore();
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchHotels = async () => {
    try {
      const res = await api.get('/hotels');
      setHotels(res.data.hotels);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ROOT_ADMIN') {
      fetchHotels();
    }
  }, [user]);

  if (user?.role !== 'ROOT_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-card-dark rounded-xl border border-red-500/10">
        <ShieldAlert size={48} className="text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-white">Access Denied</h2>
        <p className="text-slate-400 text-xs mt-1">This module is reserved for Root Administrative Accounts only.</p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingHotel(null);
    reset({
      name: '',
      code: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      googleLocationLink: '',
      subscriptionPlan: 'Standard',
      status: 'Active',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (hotel: HotelData) => {
    setEditingHotel(hotel);
    reset({
      name: hotel.name,
      code: hotel.code,
      email: hotel.email,
      phone: hotel.phone,
      street: hotel.address.street,
      city: hotel.address.city,
      state: hotel.address.state,
      zip: hotel.address.zip,
      country: hotel.address.country,
      googleLocationLink: hotel.googleLocationLink || '',
      subscriptionPlan: hotel.subscriptionPlan,
      status: hotel.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure')) return;
    try {
      await api.delete(`/hotels/${id}`);
      fetchHotels();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const onSubmit = async (values: any) => {
    setActionLoading(true);
    setErrorMsg(null);
    const payload = {
      name: values.name,
      code: values.code,
      email: values.email,
      phone: values.phone,
      address: {
        street: values.street,
        city: values.city,
        state: values.state,
        zip: values.zip,
        country: values.country,
      },
      googleLocationLink: values.googleLocationLink,
      subscriptionPlan: values.subscriptionPlan,
      status: values.status,
    };

    try {
      if (editingHotel) {
        await api.put(`/hotels/${editingHotel._id}`, payload);
      } else {
        await api.post('/hotels', payload);
      }
      setModalOpen(false);
      fetchHotels();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Hotels Directory</h1>
          <p className="text-slate-400 text-xs mt-1">Manage global multi-tenant hotel networks.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Create Hotel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Hotel Name</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Subscription</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {hotels.map((hotel) => (
                  <tr key={hotel._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {hotel.name}
                        {hotel.googleLocationLink && (
                          <a
                            href={hotel.googleLocationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:text-gold-light transition-colors"
                            title="View on Google Maps"
                          >
                            <MapPin size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-gold uppercase">{hotel.code}</td>
                    <td className="p-4">
                      <div>{hotel.email || '—'}</div>
                      <div className="text-slate-500 mt-0.5">{hotel.phone || '—'}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-800/80 text-slate-200 border border-slate-700 px-2 py-1 rounded text-[10px] uppercase font-semibold">
                        {hotel.subscriptionPlan}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        hotel.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hotel.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                        {hotel.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(hotel)}
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(hotel._id)}
                        className="p-1.5 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {hotels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">
                      No hotels registered in system. Click "Create Hotel" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">{editingHotel ? 'Edit Hotel Profile' : 'Register New Hotel'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs text-red-300 rounded">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Hotel Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('name')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Hotel Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingHotel}
                    placeholder="e.g. gpr"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-50"
                    {...register('code')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('email')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800/60 pt-3">
                <h4 className="font-bold text-white mb-2 uppercase text-[10px] tracking-widest text-gold">Location Address</h4>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Street Address</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('street')}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      {...register('city')}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">State</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      {...register('state')}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">ZIP Code</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      {...register('zip')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Country</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('country')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Google Location Link</label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('googleLocationLink')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Subscription Tier</label>
                  <select
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('subscriptionPlan')}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('status')}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingHotel ? 'Save Changes' : 'Confirm Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
