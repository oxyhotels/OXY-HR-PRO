'use client';

import React, { use, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { ShieldCheck, UserPlus, Info, CheckCircle2, AlertTriangle, Loader2, ChevronDown, Search, Compass, Building } from 'lucide-react';
import QRScannerModal from '@/components/QRScannerModal';
import GoogleIcon from '@/components/GoogleIcon';
import { INDIA_STATES_DISTRICTS } from '@/constants/indiaStatesDistricts';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  label,
  error
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  label: string;
  error?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-950 text-white border rounded-lg px-3.5 py-2 text-xs flex justify-between items-center cursor-pointer outline-none transition-all ${
          disabled ? 'opacity-40 cursor-not-allowed border-slate-800' : 'border-slate-800 hover:border-gold/60 focus:border-gold'
        }`}
      >
        <span className={value ? 'text-white' : 'text-slate-605 font-medium'}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-[#0b1424] border border-slate-800 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden animate-in fade-in duration-200">
          <div className="p-2 border-b border-slate-800 flex items-center gap-1.5 bg-slate-950/60">
            <Search size={12} className="text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white border-none outline-none text-xs placeholder:text-slate-600 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-48 py-1">
            {filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`px-3.5 py-2 text-xs text-slate-300 hover:bg-gold/10 hover:text-white cursor-pointer transition-colors ${
                  opt === value ? 'bg-gold/15 text-gold font-bold' : ''
                }`}
              >
                {opt}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3.5 py-3 text-xs text-slate-500 text-center italic">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </div>
  );
};
interface InviteDetails {
  inviteCode: string;
  inviteLink: string;
  organizationId: { _id: string; name: string; code?: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string; designation?: string };
  inviteType?: 'employee' | 'manager';
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // File uploads
  const [aadhaarFile, setAadhaarFile] = useState<string | null>(null);
  const [panFile, setPanFile] = useState<string | null>(null);
  const [bankFile, setBankFile] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<string | null>(null);

  // Address & Map states
  const [homeAddress, setHomeAddress] = useState('');
  const [homeState, setHomeState] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [homePincode, setHomePincode] = useState('');
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [homeGoogleMapLink, setHomeGoogleMapLink] = useState('');
  const [homePlaceId, setHomePlaceId] = useState('');
  const [resolvingLink, setResolvingLink] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  // Leaflet state
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    employeeId: '', // acts as Manager/Employee code
    designation: '',
    password: '',
    confirmPassword: '',
    aadhaarNumber: '',
    panNumber: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    joiningDate: '',
    employmentType: 'Full-Time',
    salary: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await api.get(`/hierarchy/invite/${code}`);
        setInvite(res.data.invite);
      } catch (err: any) {
        setErrorMsg(err.message || 'The invitation link is invalid, disabled, or expired.');
      } finally {
        setLoading(false);
      }
    };
    if (code) {
      fetchInvite();
    }
  }, [code]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet);
        setLeafletLoaded(true);
      });
      if (!document.getElementById('leaflet-css-join')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-join';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !L || !invite) return;

    const mapId = 'join-map';
    const mapEl = document.getElementById(mapId);
    if (!mapEl) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const initialLat = homeLatitude || 20.5937;
    const initialLng = homeLongitude || 78.9629;
    const initialZoom = homeLatitude ? 15 : 5;

    const map = L.map(mapId).setView([initialLat, initialLng], initialZoom);
    setMapInstance(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker: any = null;
    if (homeLatitude && homeLongitude) {
      marker = L.marker([homeLatitude, homeLongitude]).addTo(map);
      setMarkerInstance(marker);
    }

    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      setHomeLatitude(lat);
      setHomeLongitude(lng);

      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        const newMarker = L.marker(e.latlng).addTo(map);
        marker = newMarker;
        setMarkerInstance(newMarker);
      }
      map.setView(e.latlng, 15);

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          setHomeAddress(data.display_name || '');
          setHomeState(addr.state || '');
          setHomeDistrict(addr.county || addr.district || addr.state_district || '');
          setHomeCity(addr.city || addr.town || addr.village || addr.suburb || '');
          setHomePincode(addr.postcode || '');
          setLocationVerified(true);
          setHomeGoogleMapLink(`https://www.google.com/maps?q=${lat},${lng}`);
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      }
    });

    return () => {
      map.remove();
      setMapInstance(null);
      setMarkerInstance(null);
    };
  }, [leafletLoaded, L, invite]);

  const handleParseAndSetGoogleMapLink = async () => {
    const rawLink = homeGoogleMapLink.trim();
    if (!rawLink) {
      alert('Please paste a Google Maps link first.');
      return;
    }
    if (resolvingLink) return;

    setResolvingLink(true);
    setLocationDetected(false);
    try {
      const res = await fetch(`/api/auth/resolve-map-link?url=${encodeURIComponent(rawLink)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resolve Google Maps link.');
      }

      const { lat, lng, placeId, address, city, district, state, pincode, finalUrl } = data;

      if (address) setHomeAddress(address);
      if (state) setHomeState(state);
      if (district) setHomeDistrict(district);
      if (city) setHomeCity(city);
      if (pincode) setHomePincode(pincode);
      if (placeId) setHomePlaceId(placeId);

      setHomeLatitude(lat);
      setHomeLongitude(lng);
      setHomeGoogleMapLink(finalUrl || `https://www.google.com/maps?q=${lat},${lng}`);
      setLocationVerified(true);
      setLocationDetected(true);

      if (mapInstance) {
        mapInstance.setView([lat, lng], 16);
        if (markerInstance) {
          markerInstance.setLatLng([lat, lng]);
        } else {
          const newMarker = L.marker([lat, lng]).addTo(mapInstance);
          setMarkerInstance(newMarker);
        }
      }
    } catch (err: any) {
      console.error('Google Maps link error:', err);
      alert(err.message || 'Could not resolve the Google Maps link. Please check the URL and try again.');
    } finally {
      setResolvingLink(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      errors.mobile = 'Mobile number must be a valid 10-digit number';
    }
    if (!formData.employeeId.trim()) {
      errors.employeeId = invite?.inviteType === 'manager' ? 'Manager Code is required' : 'Employee Code is required';
    }
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    if (!homeAddress.trim()) errors.homeAddress = 'Home address is required';
    if (!homeState) errors.homeState = 'State is required';
    if (!homeDistrict) errors.homeDistrict = 'District is required';
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!locationVerified) {
      errors.location = 'Please pin/verify your location on the map';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementsByName(firstErrorKey)[0];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const documents = [];
    if (aadhaarFile) {
      documents.push({ name: 'Aadhaar Card', fileUrl: aadhaarFile, uploadedAt: new Date() });
    }
    if (panFile) {
      documents.push({ name: 'PAN Card', fileUrl: panFile, uploadedAt: new Date() });
    }
    if (bankFile) {
      documents.push({ name: 'Bank Document', fileUrl: bankFile, uploadedAt: new Date() });
    }
    if (resumeFile) {
      documents.push({ name: 'Resume', fileUrl: resumeFile, uploadedAt: new Date() });
    }

    try {
      const reportingManager = invite ? `${invite.managerId.firstName} ${invite.managerId.lastName}` : '';
      const finalRole = invite?.inviteType === 'manager' ? 'DEPT_MANAGER' : 'EMPLOYEE';

      await api.post('/hierarchy/join', {
        inviteCode: code,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        employeeId: formData.employeeId,
        designation: formData.designation,
        password: formData.password,
        joinRole: finalRole,
        state: homeState,
        district: homeDistrict,
        homeLocation: {
          address: homeAddress,
          latitude: homeLatitude,
          longitude: homeLongitude,
          state: homeState,
          district: homeDistrict,
          city: homeCity,
          pincode: homePincode,
          locationVerified: locationVerified,
          googleMapLink: homeGoogleMapLink || `https://www.google.com/maps?q=${homeLatitude},${homeLongitude}`,
          placeId: homePlaceId || undefined,
          verified: locationDetected,
          verifiedAt: new Date()
        },
        documents,
        aadhaarNumber: formData.aadhaarNumber || undefined,
        panNumber: formData.panNumber || undefined,
        bankName: formData.bankName || undefined,
        accountNo: formData.accountNo || undefined,
        ifsc: formData.ifsc || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactRelation: formData.emergencyContactRelation || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        joiningDate: formData.joiningDate || undefined,
        employmentType: formData.employmentType || undefined,
        salary: formData.salary || undefined,
        reportingManager,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Resolving Invitation QR Metadata...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] p-6 font-sans">
      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 text-gold mb-3">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OXY-HR PRO</h1>
          <p className="text-slate-400 text-xs mt-1">
            Enterprise Hierarchy {invite?.inviteType === 'manager' ? 'Manager' : 'Employee'} Joining Portal
          </p>
        </div>

        {errorMsg && !submitted && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-xs">
            <AlertTriangle className="shrink-0 w-5 h-5 text-red-400" />
            <div>
              <p className="font-bold">Registration Alert</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-white">Join Request Received!</h2>
            <p className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
              Your profile has been submitted to your reporting manager{' '}
              <span className="text-gold font-semibold">
                {invite?.managerId.firstName} {invite?.managerId.lastName}
              </span>
              .
            </p>
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-left text-xs text-slate-400">
              <div className="flex gap-2">
                <Info size={16} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">What happens next?</p>
                  <p className="mt-1">
                    Once the manager approves your registration, your account status will transition to{' '}
                    <span className="text-green-400 font-medium">Active</span> and you can log in to view your profile, attendance logs, and dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          invite && (
            <div className="space-y-6">
              {/* Invite Meta Details */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-2.5">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Invitation From</p>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{invite.organizationId.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{invite.departmentId.name} Department</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gold font-medium">
                      {invite.managerId.firstName} {invite.managerId.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{invite.managerId.designation || 'Reporting Manager'}</p>
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Account & Contact */}
                <div className="space-y-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  <h3 className="text-xs font-bold uppercase text-gold border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <UserPlus size={14} />
                    Account & Contact Information
                  </h3>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your complete legal name"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                    />
                    {formErrors.name && <p className="text-red-400 text-[10px] mt-1">{formErrors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@hotel.com"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                      {formErrors.email && <p className="text-red-400 text-[10px] mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Mobile Number *</label>
                      <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="10-digit number"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                      {formErrors.mobile && <p className="text-red-400 text-[10px] mt-1">{formErrors.mobile}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create strong account password"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                      {formErrors.password && <p className="text-red-400 text-[10px] mt-1">{formErrors.password}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Confirm Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                      {formErrors.confirmPassword && <p className="text-red-400 text-[10px] mt-1">{formErrors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                {/* Section 2: Position & Work Details */}
                <div className="space-y-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  <h3 className="text-xs font-bold uppercase text-gold border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    Position & Employment Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                        {invite.inviteType === 'manager' ? 'Manager Code *' : 'Employee Code *'}
                      </label>
                      <input
                        type="text"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                        placeholder={invite.inviteType === 'manager' ? 'e.g. MGR101' : 'e.g. EMP102'}
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                      {formErrors.employeeId && <p className="text-red-400 text-[10px] mt-1">{formErrors.employeeId}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Designation *</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="e.g. HR Executive, Housekeeping Lead"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                      {formErrors.designation && <p className="text-red-400 text-[10px] mt-1">{formErrors.designation}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Employment Type</label>
                      <select
                        name="employmentType"
                        value={formData.employmentType}
                        onChange={handleChange}
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-gold cursor-pointer"
                      >
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Expected Joining Date</label>
                      <input
                        type="date"
                        name="joiningDate"
                        value={formData.joiningDate}
                        onChange={handleChange}
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-1.5 text-xs outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Expected Salary (Monthly)</label>
                      <input
                        type="text"
                        name="salary"
                        value={formData.salary}
                        onChange={handleChange}
                        placeholder="e.g. 25000"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-550 mb-1">Department</label>
                      <p className="bg-slate-950/40 border border-slate-850 px-3.5 py-2 rounded-lg font-medium text-slate-350">{invite.departmentId.name}</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-550 mb-1">Reporting Manager</label>
                      <p className="bg-slate-950/40 border border-slate-850 px-3.5 py-2 rounded-lg font-medium text-slate-350">
                        {invite.managerId.firstName} {invite.managerId.lastName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Identity & Bank Details */}
                <div className="space-y-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  <h3 className="text-xs font-bold uppercase text-gold border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <Info size={14} />
                    Identity & Bank Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Aadhaar Card Number</label>
                      <input
                        type="text"
                        name="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onChange={handleChange}
                        placeholder="12-digit number"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">PAN Card Number</label>
                      <input
                        type="text"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleChange}
                        placeholder="10-character alphanumeric"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        placeholder="e.g. HDFC Bank"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Account Number</label>
                      <input
                        type="text"
                        name="accountNo"
                        value={formData.accountNo}
                        onChange={handleChange}
                        placeholder="Bank Account Number"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">IFSC Code</label>
                      <input
                        type="text"
                        name="ifsc"
                        value={formData.ifsc}
                        onChange={handleChange}
                        placeholder="IFSC Code"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Emergency Contacts */}
                <div className="space-y-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  <h3 className="text-xs font-bold uppercase text-gold border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    Emergency Contact Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Contact Name</label>
                      <input
                        type="text"
                        name="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleChange}
                        placeholder="Full Name"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Relation</label>
                      <input
                        type="text"
                        name="emergencyContactRelation"
                        value={formData.emergencyContactRelation}
                        onChange={handleChange}
                        placeholder="e.g. Father, Spouse"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="Mobile Number"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Home Location & Address */}
                <div className="space-y-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  <h3 className="text-xs font-bold uppercase text-gold border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <Compass size={14} />
                    Home Location Verification
                  </h3>

                  {/* Google Map Link Input Resolver */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase text-slate-400">Google Maps URL Resolver</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={homeGoogleMapLink}
                        onChange={(e) => setHomeGoogleMapLink(e.target.value)}
                        placeholder="Paste Google Maps URL here (mobile/desktop share link)"
                        className="flex-1 bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={handleParseAndSetGoogleMapLink}
                        disabled={resolvingLink}
                        className="bg-gold hover:bg-gold-light text-slate-dark px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {resolvingLink ? 'Resolving...' : 'Resolve'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      💡 Paste any Google Maps share link to instantly parse coordinates, state, district, city, address, and pincode.
                    </p>
                  </div>

                  {/* Manual Dropdowns & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SearchableDropdown
                      options={INDIA_STATES_DISTRICTS.map(s => s.state)}
                      value={homeState}
                      onChange={(val) => {
                        setHomeState(val);
                        setHomeDistrict('');
                      }}
                      placeholder="Select State"
                      label="State *"
                      error={formErrors.homeState}
                    />

                    <SearchableDropdown
                      options={INDIA_STATES_DISTRICTS.find(s => s.state === homeState)?.districts || []}
                      value={homeDistrict}
                      onChange={(val) => {
                        setHomeDistrict(val);
                      }}
                      placeholder={homeState ? "Select District" : "Select State First"}
                      disabled={!homeState}
                      label="District *"
                      error={formErrors.homeDistrict}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">City / Town / Village</label>
                      <input
                        type="text"
                        value={homeCity}
                        onChange={(e) => setHomeCity(e.target.value)}
                        placeholder="e.g. Jamshedpur"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Postal Pincode</label>
                      <input
                        type="text"
                        value={homePincode}
                        onChange={(e) => setHomePincode(e.target.value)}
                        placeholder="6-digit pincode"
                        className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Full Physical Address *</label>
                    <textarea
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      placeholder="House No, Road Name, Area/Landmark"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-650 min-h-[60px]"
                    />
                    {formErrors.homeAddress && <p className="text-red-400 text-[10px] mt-1">{formErrors.homeAddress}</p>}
                  </div>

                  {/* Leaflet Map Preview Container */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase text-slate-400">
                      Geographical Map Pin *
                    </label>
                    <div className="relative border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                      <div id="join-map" style={{ height: '220px', width: '100%', zIndex: 1 }} className="bg-slate-950" />
                      {!locationVerified && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
                          <p className="bg-slate-900 border border-slate-800 text-gold text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-wider">
                            📌 Click on Map to Pin / Confirm Home Location
                          </p>
                        </div>
                      )}
                    </div>
                    {formErrors.location && <p className="text-red-400 text-[10px] mt-1">{formErrors.location}</p>}
                    {homeLatitude && homeLongitude && (
                      <div className="text-[10px] text-slate-500 font-mono flex justify-between bg-slate-950/40 p-2 border border-slate-850 rounded-lg">
                        <span>Lat: {homeLatitude.toFixed(6)}</span>
                        <span>Lng: {homeLongitude.toFixed(6)}</span>
                        <span className="text-green-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 6: Documents Upload */}
                <div className="space-y-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  <h3 className="text-xs font-bold uppercase text-gold border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <Building size={14} />
                    Documents Upload (PDF / Images)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Aadhaar Upload */}
                    <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl relative hover:border-slate-800 transition-colors">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Aadhaar Card Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, setAadhaarFile)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-850 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer cursor-pointer"
                      />
                      {aadhaarFile && (
                        <p className="text-[9px] text-green-400 font-bold mt-1.5 flex items-center gap-0.5 select-none">
                          <CheckCircle2 size={10} /> Aadhaar Loaded Successfully
                        </p>
                      )}
                    </div>

                    {/* PAN Upload */}
                    <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl relative hover:border-slate-800 transition-colors">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">PAN Card Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, setPanFile)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-850 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer cursor-pointer"
                      />
                      {panFile && (
                        <p className="text-[9px] text-green-400 font-bold mt-1.5 flex items-center gap-0.5 select-none">
                          <CheckCircle2 size={10} /> PAN Loaded Successfully
                        </p>
                      )}
                    </div>

                    {/* Bank Upload */}
                    <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl relative hover:border-slate-800 transition-colors">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Bank Passbook / Cancelled Cheque</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, setBankFile)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-850 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer cursor-pointer"
                      />
                      {bankFile && (
                        <p className="text-[9px] text-green-400 font-bold mt-1.5 flex items-center gap-0.5 select-none">
                          <CheckCircle2 size={10} /> Bank Document Loaded
                        </p>
                      )}
                    </div>

                    {/* Resume Upload */}
                    <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl relative hover:border-slate-800 transition-colors">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Resume / CV Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, setResumeFile)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-850 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer cursor-pointer"
                      />
                      {resumeFile && (
                        <p className="text-[9px] text-green-400 font-bold mt-1.5 flex items-center gap-0.5 select-none">
                          <CheckCircle2 size={10} /> Resume Loaded Successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-dark" />
                      Submitting Join Request...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Submit Join Request
                    </>
                  )}
                </button>
              </form>
            </div>
          )
        )}
      </div>

      {/* Floating QR Scanner Button */}
      <div className="fixed right-6 bottom-6 z-40">
        <button
          onClick={() => {
            setScannerOpen(true);
          }}
          className="bg-slate-900/95 hover:bg-slate-800/95 text-gold border border-gold/30 hover:border-gold/60 w-14 h-14 rounded-full shadow-[0_0_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group hover:shadow-gold/10 cursor-pointer"
          style={{ textShadow: '0 0 10px rgba(212,175,55,0.2)' }}
        >
          <div className="flex flex-col items-center justify-center">
            <GoogleIcon name="qr_code_scanner" size={22} className="animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5 select-none">Scan</span>
          </div>
        </button>
      </div>

      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
}
