'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import GoogleIcon from './GoogleIcon';
import { DEPARTMENTS } from '@/constants/departments';
import { ChevronDown, Search } from 'lucide-react';
import { INDIA_STATES_DISTRICTS } from '@/constants/indiaStatesDistricts';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  label
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  label: string;
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
      <label className="block text-slate-400 font-semibold mb-1">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-950/60 border rounded py-1.5 px-3 text-white flex justify-between items-center cursor-pointer outline-none transition-all ${
          disabled ? 'opacity-40 cursor-not-allowed border-slate-800' : 'border-slate-800 hover:border-gold/60 focus:border-gold'
        }`}
      >
        <span className={value ? 'text-white text-xs' : 'text-slate-500 text-xs'}>
          {value || placeholder}
        </span>
        <ChevronDown size={12} className="text-slate-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-[#0b1424] border border-slate-800 rounded shadow-xl max-h-60 flex flex-col overflow-hidden animate-in fade-in duration-200">
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
                className={`px-3 py-1.5 text-xs text-slate-300 hover:bg-gold/10 hover:text-white cursor-pointer transition-colors ${
                  opt === value ? 'bg-gold/15 text-gold font-bold' : ''
                }`}
              >
                {opt}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-500 text-center italic">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  property: z.string().optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  designation: z.string().optional(),
  role: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const employeeRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  property: z.string().optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  role: z.string().default('EMPLOYEE'),
  employeeId: z.string().optional(),
  reportingManager: z.string().optional(),
  employmentType: z.string().optional(),
  designation: z.string().optional(),
  salary: z.string().optional(),
  address: z.string().optional(),
  aadhaarNumber: z.string().optional().or(z.literal('')),
  panNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  joiningDate: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export interface InviteData {
  inviteCode: string;
  organizationId: { _id: string; name: string; code?: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string; designation?: string };
  hotelId?: { _id: string; name: string; hotelCode?: string };
  inviteType?: 'employee' | 'manager';
}

interface SignUpFormsProps {
  onRegisterSuccess: () => void;
  inviteData?: InviteData;
}

export default function SignUpForms({ onRegisterSuccess, inviteData }: SignUpFormsProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [signupType, setSignupType] = useState<'manager' | 'employee'>('manager');
  const [publicManagers, setPublicManagers] = useState<any[]>([]);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await api.get('/organization/public-managers');
        if (res?.data?.managers) {
          setPublicManagers(res.data.managers);
        }
      } catch (err) {
        console.error('Failed to load active managers', err);
      }
    };
    fetchManagers();
  }, []);

  // Password visibility states
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmpRegisterPassword, setShowEmpRegisterPassword] = useState(false);
  const [showEmpConfirmPassword, setShowEmpConfirmPassword] = useState(false);

  // Employee doc uploads states
  const [empAadhaarFile, setEmpAadhaarFile] = useState<string | null>(null);
  const [empPanFile, setEmpPanFile] = useState<string | null>(null);
  const [empBankFile, setEmpBankFile] = useState<string | null>(null);
  const [empResumeFile, setEmpResumeFile] = useState<string | null>(null);

  // Manager doc uploads states
  const [mgrAadhaarFile, setMgrAadhaarFile] = useState<string | null>(null);
  const [mgrPanFile, setMgrPanFile] = useState<string | null>(null);
  const [mgrBankFile, setMgrBankFile] = useState<string | null>(null);
  const [mgrResumeFile, setMgrResumeFile] = useState<string | null>(null);

  // Home Location states
  const [homeAddress, setHomeAddress] = useState('');
  const [homeState, setHomeState] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [homePincode, setHomePincode] = useState('');
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [homeGoogleMapLink, setHomeGoogleMapLink] = useState('');
  const [homePlaceId, setHomePlaceId] = useState('');
  const [resolvingLink, setResolvingLink] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  // Leaflet states
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet);
        setLeafletLoaded(true);
      });
      // Load leaflet CSS
      if (!document.getElementById('leaflet-css-signup')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-signup';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!leafletLoaded || !L) return;

    const mapId = signupType === 'manager' ? 'map-manager' : 'map-employee';
    const mapEl = document.getElementById(mapId);
    if (!mapEl) return;

    // Reset default icon path
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const initialLat = homeLatitude || 20.5937; // Default to India center
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

    // Click on map to select location (Method B)
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

      // Call Reverse Geocoding
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
  }, [leafletLoaded, L, signupType]);

  const handleParseAndSetGoogleMapLink = async () => {
    const rawLink = homeGoogleMapLink.trim();
    if (!rawLink) {
      alert('Please paste a Google Maps link first.');
      return;
    }
    if (resolvingLink) return; // Prevent duplicate requests

    setResolvingLink(true);
    setLocationDetected(false);
    try {
      // Always delegate to our server-side route which handles ALL Google Maps URL formats
      // and uses the Google Maps Geocoding + Places API for accurate address extraction
      const res = await fetch(`/api/auth/resolve-map-link?url=${encodeURIComponent(rawLink)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resolve Google Maps link.');
      }

      const { lat, lng, placeId, address, city, district, state, pincode, finalUrl } = data;

      // Fill all address fields
      if (address) setHomeAddress(address);
      if (state)   setHomeState(state);
      if (district) setHomeDistrict(district);
      if (city)    setHomeCity(city);
      if (pincode) setHomePincode(pincode);
      if (placeId) setHomePlaceId(placeId);

      setHomeLatitude(lat);
      setHomeLongitude(lng);
      setHomeGoogleMapLink(finalUrl || `https://www.google.com/maps?q=${lat},${lng}`);
      setLocationVerified(true);
      setLocationDetected(true);

      // Update map marker
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

  const handleGeocodeAddress = async () => {
    if (!homeAddress && !homeCity && !homeState) {
      alert('Please fill at least the Address, City, and State fields to search.');
      return;
    }
    const queries = [
      `${homeAddress} ${homeCity} ${homeState} ${homePincode}`,
      `${homeCity} ${homeState} ${homePincode}`,
      `${homeDistrict} ${homeState} ${homePincode}`,
      `${homePincode}`,
      `${homeCity} ${homeState}`,
      `${homeState}`
    ].map(q => q.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const uniqueQueries = Array.from(new Set(queries));

    let data = [];
    for (const query of uniqueQueries) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`);
        const result = await res.json();
        if (result && result.length > 0) {
          data = result;
          break;
        }
      } catch (err) {
        console.error(`Error searching query "${query}":`, err);
      }
    }

    let lat = 20.5937;
    let lng = 78.9629;
    let resolved = false;

    if (data && data.length > 0) {
      const first = data[0];
      lat = parseFloat(first.lat);
      lng = parseFloat(first.lon);
      resolved = true;

      const addr = first.address || {};
      setHomeState(addr.state || homeState || '');
      setHomeDistrict(addr.county || addr.district || addr.state_district || homeDistrict || '');
      setHomeCity(addr.city || addr.town || addr.village || addr.suburb || homeCity || '');
      setHomePincode(addr.postcode || homePincode || '');
      if (first.display_name) {
        setHomeAddress(first.display_name);
      }
    } else {
      if (mapInstance) {
        const center = mapInstance.getCenter();
        lat = center.lat;
        lng = center.lng;
      }
      resolved = true;
    }

    setHomeLatitude(lat);
    setHomeLongitude(lng);
    setLocationVerified(true);
    setHomeGoogleMapLink(`https://www.google.com/maps?q=${lat},${lng}`);

    if (mapInstance) {
      mapInstance.setView([lat, lng], resolved ? 15 : 5);
      if (markerInstance) {
        markerInstance.setLatLng([lat, lng]);
      } else {
        const newMarker = L.marker([lat, lng]).addTo(mapInstance);
        setMarkerInstance(newMarker);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setHomeLatitude(latitude);
        setHomeLongitude(longitude);

        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 15);
          if (markerInstance) {
            markerInstance.setLatLng([latitude, longitude]);
          } else {
            const newMarker = L.marker([latitude, longitude]).addTo(mapInstance);
            setMarkerInstance(newMarker);
          }
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            setHomeAddress(data.display_name || '');
            setHomeState(addr.state || '');
            setHomeDistrict(addr.county || addr.district || addr.state_district || '');
            setHomeCity(addr.city || addr.town || addr.village || addr.suburb || '');
            setHomePincode(addr.postcode || '');
            setLocationVerified(true);
            setHomeGoogleMapLink(`https://www.google.com/maps?q=${latitude},${longitude}`);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Permission denied or failed to retrieve GPS coordinates.');
      }
    );
  };

  // Fetch properties only when SignUpForms is mounted (lazy loaded!)
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await api.get('/hotels/public');
        setProperties(res.data.hotels || []);
      } catch (err) {
        console.error('Failed to load active properties', err);
      }
    };
    fetchProperties();
  }, []);

  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(DEPARTMENTS));

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/organization/public-departments');
        if (res?.data?.departments) {
          setDepartmentsList(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load active departments', err);
      }
    };
    fetchDepts();
  }, []);

  // Sign Up Form Hook
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
    reset: resetSignup,
    watch: watchSignup,
    setValue: setValueSignup,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      property: '',
      department: '',
      category: '',
      designation: '',
      role: '',
    },
  });

  // Employee Sign Up Form Hook
  const {
    register: registerEmpSignup,
    handleSubmit: handleSubmitEmpSignup,
    formState: { errors: empSignupErrorsRaw },
    reset: resetEmpSignup,
    watch: watchEmpSignup,
    setValue: setValueEmpSignup,
  } = useForm<any>({
    resolver: zodResolver(employeeRegisterSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      property: '',
      department: '',
      category: '',
      designation: '',
      role: 'EMPLOYEE',
      employeeId: '',
      reportingManager: '',
      employmentType: '',
      salary: '',
      address: '',
      aadhaarNumber: '',
      panNumber: '',
      bankName: '',
      accountNo: '',
      ifsc: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      joiningDate: '',
    },
  });
  const empSignupErrors = empSignupErrorsRaw as any;

  useEffect(() => {
    if (inviteData) {
      setSignupType(inviteData.inviteType === 'employee' ? 'employee' : 'manager');
      const deptName = inviteData.departmentId?.name || '';
      const hotelId = inviteData.hotelId?._id || '';
      
      if (inviteData.inviteType === 'employee') {
        setValueEmpSignup('department', deptName);
        setValueEmpSignup('property', hotelId);
        setValueEmpSignup('reportingManager', inviteData.managerId?._id || '');
      } else {
        setValueSignup('department', deptName);
        setValueSignup('property', hotelId);
      }
    }
  }, [inviteData, setValueSignup, setValueEmpSignup]);

  // Watchers for dynamic dropdown logic — default to '' to prevent undefined flowing into helpers
  const selectedDeptSignup = watchSignup('department') ?? '';
  const selectedCategorySignup = watchSignup('category') ?? '';

  const selectedDeptEmpSignup = watchEmpSignup('department') ?? '';
  const selectedCategoryEmpSignup = watchEmpSignup('category') ?? '';

  // Clear dependent fields when department changes
  useEffect(() => {
    if (selectedDeptSignup) {
      setValueSignup('category', '');
      setValueSignup('designation', '');
    }
  }, [selectedDeptSignup, setValueSignup]);

  // Clear designation when category changes
  useEffect(() => {
    if (selectedCategorySignup) {
      setValueSignup('designation', '');
    }
  }, [selectedCategorySignup, setValueSignup]);

  // Clear dependent fields when department changes (Employee)
  useEffect(() => {
    if (selectedDeptEmpSignup) {
      setValueEmpSignup('category', '');
      setValueEmpSignup('designation', '');
    }
  }, [selectedDeptEmpSignup, setValueEmpSignup]);

  // Clear designation when category changes (Employee)
  useEffect(() => {
    if (selectedCategoryEmpSignup) {
      setValueEmpSignup('designation', '');
    }
  }, [selectedCategoryEmpSignup, setValueEmpSignup]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    // No strict address, map validation, or consent checks because they are optional now

    // Construct documents payload
    const documents = [];
    if (mgrAadhaarFile) {
      documents.push({ name: 'Aadhaar Card', fileUrl: mgrAadhaarFile, uploadedAt: new Date().toISOString() });
    }
    if (mgrPanFile) {
      documents.push({ name: 'PAN Card', fileUrl: mgrPanFile, uploadedAt: new Date().toISOString() });
    }
    if (mgrBankFile) {
      documents.push({ name: 'Bank Document', fileUrl: mgrBankFile, uploadedAt: new Date().toISOString() });
    }
    if (mgrResumeFile) {
      documents.push({ name: 'Resume', fileUrl: mgrResumeFile, uploadedAt: new Date().toISOString() });
    }

    const homeLocation = {
      address: homeAddress,
      latitude: homeLatitude,
      longitude: homeLongitude,
      state: homeState,
      district: homeDistrict,
      city: homeCity,
      pincode: homePincode,
      locationVerified: locationVerified,
      googleMapLink: homeGoogleMapLink || (homeLatitude && homeLongitude ? `https://www.google.com/maps?q=${homeLatitude},${homeLongitude}` : undefined),
      placeId: homePlaceId || undefined,
      verified: locationDetected,
      verifiedAt: new Date().toISOString()
    };

    const payload = {
      ...values,
      documents,
      homeLocation,
      inviteCode: inviteData?.inviteCode
    };

    try {
      await api.post('/auth/register', payload);
      resetSignup();
      setMgrAadhaarFile(null);
      setMgrPanFile(null);
      setMgrBankFile(null);
      setMgrResumeFile(null);
      setHomeAddress('');
      setHomeState('');
      setHomeDistrict('');
      setHomeCity('');
      setHomePincode('');
      setHomeLatitude(null);
      setHomeLongitude(null);
      setLocationVerified(false);
      setConsentChecked(false);
      setHomeGoogleMapLink('');
      setHomePlaceId('');
      setLocationDetected(false);
      onRegisterSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onEmployeeRegisterSubmit = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);

    // No strict address, map validation, or consent checks because they are optional now
    
    // Construct documents payload
    const documents = [];
    if (empAadhaarFile) {
      documents.push({ name: 'Aadhaar Card', fileUrl: empAadhaarFile, uploadedAt: new Date().toISOString() });
    }
    if (empPanFile) {
      documents.push({ name: 'PAN Card', fileUrl: empPanFile, uploadedAt: new Date().toISOString() });
    }
    if (empBankFile) {
      documents.push({ name: 'Bank Document', fileUrl: empBankFile, uploadedAt: new Date().toISOString() });
    }
    if (empResumeFile) {
      documents.push({ name: 'Resume', fileUrl: empResumeFile, uploadedAt: new Date().toISOString() });
    }

    const homeLocation = {
      address: homeAddress,
      latitude: homeLatitude,
      longitude: homeLongitude,
      state: homeState,
      district: homeDistrict,
      city: homeCity,
      pincode: homePincode,
      locationVerified: locationVerified,
      googleMapLink: homeGoogleMapLink || (homeLatitude && homeLongitude ? `https://www.google.com/maps?q=${homeLatitude},${homeLongitude}` : undefined),
      placeId: homePlaceId || undefined,
      verified: locationDetected,
      verifiedAt: new Date().toISOString()
    };

    const payload = {
      ...values,
      role: 'EMPLOYEE', // Hardcoded for self-signing employees
      documents,
      homeLocation,
      inviteCode: inviteData?.inviteCode
    };

    try {
      await api.post('/auth/register', payload);
      resetEmpSignup();
      setEmpAadhaarFile(null);
      setEmpPanFile(null);
      setEmpBankFile(null);
      setEmpResumeFile(null);
      setHomeAddress('');
      setHomeState('');
      setHomeDistrict('');
      setHomeCity('');
      setHomePincode('');
      setHomeLatitude(null);
      setHomeLongitude(null);
      setLocationVerified(false);
      setConsentChecked(false);
      setHomeGoogleMapLink('');
      setHomePlaceId('');
      setLocationDetected(false);
      onRegisterSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Signup Type Sub-tabs */}
      <div className="flex bg-slate-950/40 p-1 rounded-lg border border-slate-900 mb-4 text-[10px]">
        <button
          type="button"
          disabled={!!inviteData}
          onClick={() => {
            setSignupType('manager');
            setErrorMsg(null);
          }}
          className={`flex-1 py-1.5 text-center rounded transition-all font-bold ${
            signupType === 'manager' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
          } ${!!inviteData ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Manager Sign Up
        </button>
        <button
          type="button"
          disabled={!!inviteData}
          onClick={() => {
            setSignupType('employee');
            setErrorMsg(null);
          }}
          className={`flex-1 py-1.5 text-center rounded transition-all font-bold ${
            signupType === 'employee' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
          } ${!!inviteData ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Employee Sign Up
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {signupType === 'manager' ? (
        <form key="manager-form" onSubmit={handleSubmitSignup(onRegisterSubmit)} className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <GoogleIcon name="person" size={14} />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  style={{ paddingLeft: '40px' }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold input-with-icon-left"
                  {...registerSignup('fullName')}
                />
              </div>
              {signupErrors.fullName && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Mobile Number *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <GoogleIcon name="phone" size={14} />
                </span>
                <input
                  type="text"
                  placeholder="9876543210"
                  style={{ paddingLeft: '40px' }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold input-with-icon-left"
                  {...registerSignup('phone')}
                />
              </div>
              {signupErrors.phone && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Email (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                <GoogleIcon name="mail" size={14} />
              </span>
              <input
                type="email"
                placeholder="john@hotel.com"
                style={{ paddingLeft: '40px' }}
                className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold input-with-icon-left"
                {...registerSignup('email')}
              />
            </div>
            {signupErrors.email && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <GoogleIcon name="lock" size={14} />
                </span>
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ paddingLeft: '40px' }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-10 text-white focus:outline-none focus:border-gold input-with-icon-left"
                  {...registerSignup('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white cursor-pointer"
                >
                  {showRegisterPassword ? <GoogleIcon name="visibility_off" size={14} /> : <GoogleIcon name="visibility" size={14} />}
                </button>
              </div>
              {signupErrors.password && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.password.message}</p>}
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Confirm Password *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <GoogleIcon name="lock" size={14} />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ paddingLeft: '40px' }}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-10 text-white focus:outline-none focus:border-gold input-with-icon-left"
                  {...registerSignup('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? <GoogleIcon name="visibility_off" size={14} /> : <GoogleIcon name="visibility" size={14} />}
                </button>
              </div>
              {signupErrors.confirmPassword && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.confirmPassword.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="work" size={14} />
                  </span>
                  <select
                    disabled={!!inviteData}
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left disabled:opacity-50"
                    {...registerSignup('department')}
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Select Department</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept} className="bg-slate-950 text-white">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                {signupErrors.department && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.department.message}</p>}
              </div>

              {/* Conditional Property Dropdown */}
              {selectedDeptSignup === 'PROPERTY' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Property (Optional)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                      <GoogleIcon name="corporate_fare" size={14} />
                    </span>
                    <select
                      disabled={!!inviteData && !!inviteData.hotelId}
                      style={{ paddingLeft: '40px' }}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left disabled:opacity-50"
                      {...registerSignup('property')}
                    >
                      <option value="" className="bg-slate-950 text-slate-400">Select Existing Property</option>
                      {properties.map((p) => (
                        <option key={p._id} value={p._id} className="bg-slate-950 text-white">
                          {p.name}
                        </option>
                      ))}
                      <option value="other" className="bg-slate-950 text-white">Other</option>
                    </select>
                  </div>
                  {signupErrors.property && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.property.message}</p>}
                </div>
              )}

              {/* Dependent Category & Designation Dropdowns */}
              {selectedDeptSignup && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Category (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <GoogleIcon name="category" size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter Category"
                        style={{ paddingLeft: '40px' }}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold input-with-icon-left"
                        {...registerSignup('category')}
                      />
                    </div>
                    {signupErrors.category && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.category.message}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Designation (Optional)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <GoogleIcon name="badge" size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter Designation"
                        style={{ paddingLeft: '40px' }}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold input-with-icon-left"
                        {...registerSignup('designation')}
                      />
                    </div>
                    {signupErrors.designation && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.designation.message}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Role (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="person" size={14} />
                  </span>
                  <select
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left"
                    {...registerSignup('role')}
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Select Role</option>
                    <option value="EMPLOYEE" className="bg-slate-950 text-white">Employee</option>
                    <option value="DEPT_MANAGER" className="bg-slate-950 text-white">Department Manager</option>
                    <option value="HR_MANAGER" className="bg-slate-950 text-white">HR Manager</option>
                    <option value="HOTEL_ADMIN" className="bg-slate-950 text-white">Manager</option>
                  </select>
                </div>
                {signupErrors.role && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.role.message}</p>}
              </div>
            </div>
          </div>

          {/* Documents Repository */}
          <div className="space-y-3 pt-2 border-t border-slate-800/60 mt-4">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Documents Repository</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[10px]">Aadhaar Card Document</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, setMgrAadhaarFile)}
                  className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                />
                {mgrAadhaarFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Aadhaar Loaded</div>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[10px]">PAN Card Document</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, setMgrPanFile)}
                  className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                />
                {mgrPanFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ PAN Loaded</div>}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[10px]">Cancelled Cheque / Bank Doc</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, setMgrBankFile)}
                className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
              />
              {mgrBankFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Document Loaded</div>}
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[10px]">Resume (PDF format only, optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setMgrResumeFile)}
                className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
              />
              {mgrResumeFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Resume Loaded</div>}
            </div>
          </div>

          {/* Geographic Map Pin */}
          <div className="space-y-4 pt-4 border-t border-slate-800/60 mt-4">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">GEOGRAPHIC MAP PIN</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1 flex justify-between items-center">
                  <span>🗺 Home Google Map Location Link</span>
                  <span className="text-[9px] text-slate-500 font-normal">Paste any Google Maps URL to auto-fill</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/... or maps.google.com/..."
                    value={homeGoogleMapLink}
                    onChange={(e) => { setHomeGoogleMapLink(e.target.value); setLocationDetected(false); }}
                    className="flex-1 bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleParseAndSetGoogleMapLink}
                    disabled={resolvingLink || !homeGoogleMapLink.trim()}
                    className="px-4 py-1.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer min-w-[70px] justify-center"
                  >
                    {resolvingLink ? (
                      <><GoogleIcon name="progress_activity" size={12} className="animate-spin-icon" /> Fetching...</>
                    ) : 'Apply'}
                  </button>
                </div>
                {locationDetected && (
                  <div className="mt-2 p-2.5 rounded-lg border border-green-800/50 bg-green-950/30 space-y-1">
                    <p className="text-green-400 font-bold text-[10px] flex items-center gap-1"><GoogleIcon name="check_circle" size={12} /> Location detected successfully.</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
                      {homeCity    && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> City Detected</span>}
                      {homeState   && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> State Detected</span>}
                      {homePincode && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> Pincode Detected</span>}
                      {homeLatitude && homeLongitude && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> Coordinates Verified</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">Home Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="House No, Street Name, Locality"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <SearchableDropdown
                options={INDIA_STATES_DISTRICTS.map(s => s.state)}
                value={homeState}
                onChange={(val) => {
                  setHomeState(val);
                  setHomeDistrict('');
                }}
                placeholder="Select State"
                label="State (Optional)"
              />
              <SearchableDropdown
                options={INDIA_STATES_DISTRICTS.find(s => s.state === homeState)?.districts || []}
                value={homeDistrict}
                onChange={(val) => setHomeDistrict(val)}
                placeholder={homeState ? "Select District" : "Select State First"}
                disabled={!homeState}
                label="District (Optional)"
              />
              <div>
                <label className="block text-slate-400 font-semibold mb-1">City (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ranchi"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pincode (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 834001"
                  value={homePincode}
                  onChange={(e) => setHomePincode(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGeocodeAddress}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-gold font-semibold rounded text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <GoogleIcon name="search" size={12} />
                Search Location on Map
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-gold font-semibold rounded text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <GoogleIcon name="my_location" size={12} />
                Use Current Location
              </button>
            </div>

            {/* Leaflet Map Preview Container */}
            <div className="space-y-2">
              <label className="block text-slate-400 font-semibold mb-1">Location Map Preview (Optional)</label>
              <div 
                id="map-manager" 
                className="w-full h-[180px] rounded-lg border border-slate-800 z-10 bg-slate-950/40" 
              />
              <p className="text-[9px] text-slate-500 italic">
                * You can type address details and click "Search Location on Map", click directly on map to pin, or use your GPS location.
              </p>
            </div>

            {/* Coordinates & Verification Banner */}
            {homeLatitude && homeLongitude && (
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded p-2 text-[10px] text-slate-350">
                <span className="font-mono">Coordinates: {homeLatitude.toFixed(6)}, {homeLongitude.toFixed(6)}</span>
                {locationVerified && (
                  <span className="text-green-400 font-bold flex items-center gap-0.5 animate-pulse">
                    <GoogleIcon name="check_circle" size={12} />
                    ✔ Location Verified
                  </span>
                )}
              </div>
            )}

            {/* Consent Checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="consent-manager"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 cursor-pointer accent-gold h-4 w-4"
              />
              <label htmlFor="consent-manager" className="text-[10px] text-slate-400 cursor-pointer select-none leading-normal">
                I consent to storing my home address and location for HR and employment records.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase"
          >
            {loading ? (
              <>
                <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                Creating Account...
              </>
            ) : (
              <>
                Complete Registration
                <GoogleIcon name="arrow_forward" size={14} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form key="employee-form" onSubmit={handleSubmitEmpSignup(onEmployeeRegisterSubmit)} className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          <div className="border-b border-slate-800 pb-2 mb-2">
            <h4 className="text-[10px] font-bold text-gold uppercase tracking-widest font-sans">Employee Master</h4>
            <p className="text-[9px] text-slate-400 mt-0.5">Please provide complete details to register employee record.</p>
          </div>

          {/* Basic & Account Info */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Basic & Account Info</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter your full name (e.g., Dinesh Prajapati)"
                  defaultValue=""
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('fullName')}
                />
                {empSignupErrors.fullName?.message && (
                  <p className="text-red-400 text-[9px] mt-0.5">
                    {empSignupErrors.fullName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  defaultValue=""
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('phone')}
                />
                {empSignupErrors.phone?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="john@hotel.com"
                defaultValue=""
                className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                {...registerEmpSignup('email')}
              />
              {empSignupErrors.email?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Password *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="lock" size={14} />
                  </span>
                  <input
                    type={showEmpRegisterPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-10 text-white focus:outline-none focus:border-gold input-with-icon-left"
                    {...registerEmpSignup('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpRegisterPassword(!showEmpRegisterPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showEmpRegisterPassword ? <GoogleIcon name="visibility_off" size={14} /> : <GoogleIcon name="visibility" size={14} />}
                  </button>
                </div>
                {empSignupErrors.password?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.password.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Confirm Password *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="lock" size={14} />
                  </span>
                  <input
                    type={showEmpConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-10 text-white focus:outline-none focus:border-gold input-with-icon-left"
                    {...registerEmpSignup('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpConfirmPassword(!showEmpConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showEmpConfirmPassword ? <GoogleIcon name="visibility_off" size={14} /> : <GoogleIcon name="visibility" size={14} />}
                  </button>
                </div>
                {empSignupErrors.confirmPassword?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.confirmPassword.message}</p>}
              </div>
            </div>
          </div>

          {/* Job & Hotel Scoping */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Job & Hotel Scoping</h5>
            
            {/* Department Section */}
            <div>
              <label className="block text-slate-400 mb-1">Department (Optional)</label>
              <select
                disabled={!!inviteData}
                className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer disabled:opacity-50"
                {...registerEmpSignup('department')}
              >
                <option value="" className="bg-slate-950 text-slate-400">Select Department</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-950 text-white">
                    {dept}
                  </option>
                ))}
              </select>
              {empSignupErrors.department?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.department.message}</p>}
            </div>

            {/* Conditional Property Dropdown */}
            {selectedDeptEmpSignup === 'PROPERTY' && (
              <div>
                <label className="block text-slate-400 mb-1">Property Selection (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="corporate_fare" size={14} />
                  </span>
                  <select
                    disabled={!!inviteData && !!inviteData.hotelId}
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left disabled:opacity-50"
                    {...registerEmpSignup('property')}
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Select Existing Property</option>
                    {properties.map((p) => (
                      <option key={p._id} value={p._id} className="bg-slate-950 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {empSignupErrors.property?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.property.message}</p>}
              </div>
            )}

            {/* Dependent Category & Designation Dropdowns */}
            {selectedDeptEmpSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter Category"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                    {...registerEmpSignup('category')}
                  />
                  {empSignupErrors.category?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.category.message}</p>}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Designation (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter Designation"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                    {...registerEmpSignup('designation')}
                  />
                  {empSignupErrors.designation?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.designation.message}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Reporting Manager (Optional)</label>
                <select
                  disabled={!!inviteData && !!inviteData.managerId}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold disabled:opacity-50 cursor-pointer"
                  {...registerEmpSignup('reportingManager')}
                >
                  <option value="" className="bg-slate-950 text-slate-400">Select Manager</option>
                  {publicManagers.map((m) => (
                    <option key={m._id} value={m._id} className="bg-slate-950 text-white">
                      {m.firstName} {m.lastName} {m.designation ? `(${m.designation})` : ''}
                    </option>
                  ))}
                </select>
                {empSignupErrors.reportingManager?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.reportingManager.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Employment Status (Optional)</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                  {...registerEmpSignup('employmentType')}
                >
                  <option value="" className="bg-slate-950 text-slate-400">Select Status</option>
                  <option value="Full-time" className="bg-slate-950 text-white">Full-time</option>
                  <option value="Part-time" className="bg-slate-950 text-white">Part-time</option>
                  <option value="Intern" className="bg-slate-950 text-white">Intern</option>
                  <option value="Contract" className="bg-slate-950 text-white">Contract</option>
                </select>
                {empSignupErrors.employmentType?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.employmentType.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Joining Date (Optional)</label>
                <input
                  type="date"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('joiningDate')}
                />
                {empSignupErrors.joiningDate?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.joiningDate.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Salary Structure (Optional)</label>
                <input
                  type="number"
                  placeholder="25000"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('salary')}
                />
                {empSignupErrors.salary?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.salary.message}</p>}
              </div>
            </div>
          </div>

          {/* Personal & Verification Details */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Address & Verification</h5>
            <div>
              <label className="block text-slate-400 mb-1">Address (Optional)</label>
              <textarea
                rows={2}
                placeholder="Street, City, State, ZIP, Country"
                className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                {...registerEmpSignup('address')}
              />
              {empSignupErrors.address?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.address.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Aadhaar Card (Optional)</label>
                <input
                  type="text"
                  placeholder="12-digit number"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('aadhaarNumber')}
                />
                {empSignupErrors.aadhaarNumber?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.aadhaarNumber.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">PAN Card (Optional)</label>
                <input
                  type="text"
                  placeholder="10-digit PAN"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('panNumber')}
                />
                {empSignupErrors.panNumber?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.panNumber.message}</p>}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Bank Details</h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="SBI"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('bankName')}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Account No</label>
                <input
                  type="text"
                  placeholder="A/C Number"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('accountNo')}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="IFSC Code"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('ifsc')}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Emergency Contact</h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  placeholder="Contact Name"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-2 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('emergencyContactName')}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Relation</label>
                <input
                  type="text"
                  placeholder="Relation"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-2 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('emergencyContactRelation')}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="Phone"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-2 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('emergencyContactPhone')}
                />
              </div>
            </div>
          </div>

          {/* Documents Repository */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Documents Repository</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[10px]">Aadhaar Card Document</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, setEmpAadhaarFile)}
                  className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                />
                {empAadhaarFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Aadhaar Loaded</div>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[10px]">PAN Card Document</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, setEmpPanFile)}
                  className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                />
                {empPanFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ PAN Loaded</div>}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[10px]">Cancelled Cheque / Bank Doc</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, setEmpBankFile)}
                className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
              />
              {empBankFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Document Loaded</div>}
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[10px]">Resume (PDF format only, optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setEmpResumeFile)}
                className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
              />
              {empResumeFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Resume Loaded</div>}
            </div>
          </div>

          {/* Geographic Map Pin */}
          <div className="space-y-4 pt-4 border-t border-slate-800/60 mt-4">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">GEOGRAPHIC MAP PIN</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1 flex justify-between items-center">
                  <span>🗺 Home Google Map Location Link</span>
                  <span className="text-[9px] text-slate-500 font-normal">Paste any Google Maps URL to auto-fill</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/... or maps.google.com/..."
                    value={homeGoogleMapLink}
                    onChange={(e) => { setHomeGoogleMapLink(e.target.value); setLocationDetected(false); }}
                    className="flex-1 bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleParseAndSetGoogleMapLink}
                    disabled={resolvingLink || !homeGoogleMapLink.trim()}
                    className="px-4 py-1.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer min-w-[70px] justify-center"
                  >
                    {resolvingLink ? (
                      <><GoogleIcon name="progress_activity" size={12} className="animate-spin-icon" /> Fetching...</>
                    ) : 'Apply'}
                  </button>
                </div>
                {locationDetected && (
                  <div className="mt-2 p-2.5 rounded-lg border border-green-800/50 bg-green-950/30 space-y-1">
                    <p className="text-green-400 font-bold text-[10px] flex items-center gap-1"><GoogleIcon name="check_circle" size={12} /> Location detected successfully.</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
                      {homeCity    && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> City Detected</span>}
                      {homeState   && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> State Detected</span>}
                      {homePincode && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> Pincode Detected</span>}
                      {homeLatitude && homeLongitude && <span className="text-green-300 flex items-center gap-1"><GoogleIcon name="check" size={10} /> Coordinates Verified</span>}
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">Home Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="House No, Street Name, Locality"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <SearchableDropdown
                options={INDIA_STATES_DISTRICTS.map(s => s.state)}
                value={homeState}
                onChange={(val) => {
                  setHomeState(val);
                  setHomeDistrict('');
                }}
                placeholder="Select State"
                label="State (Optional)"
              />
              <SearchableDropdown
                options={INDIA_STATES_DISTRICTS.find(s => s.state === homeState)?.districts || []}
                value={homeDistrict}
                onChange={(val) => setHomeDistrict(val)}
                placeholder={homeState ? "Select District" : "Select State First"}
                disabled={!homeState}
                label="District (Optional)"
              />
              <div>
                <label className="block text-slate-400 font-semibold mb-1">City (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ranchi"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pincode (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 834001"
                  value={homePincode}
                  onChange={(e) => setHomePincode(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGeocodeAddress}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-gold font-semibold rounded text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <GoogleIcon name="search" size={12} />
                Search Location on Map
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-gold font-semibold rounded text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <GoogleIcon name="my_location" size={12} />
                Use Current Location
              </button>
            </div>

            {/* Leaflet Map Preview Container */}
            <div className="space-y-2">
              <label className="block text-slate-400 font-semibold mb-1">Location Map Preview (Optional)</label>
              <div 
                id="map-employee" 
                className="w-full h-[180px] rounded-lg border border-slate-800 z-10 bg-slate-950/40" 
              />
              <p className="text-[9px] text-slate-500 italic">
                * You can type address details and click "Search Location on Map", click directly on map to pin, or use your GPS location.
              </p>
            </div>

            {/* Coordinates & Verification Banner */}
            {homeLatitude && homeLongitude && (
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded p-2 text-[10px] text-slate-350">
                <span className="font-mono">Coordinates: {homeLatitude.toFixed(6)}, {homeLongitude.toFixed(6)}</span>
                {locationVerified && (
                  <span className="text-green-400 font-bold flex items-center gap-0.5 animate-pulse">
                    <GoogleIcon name="check_circle" size={12} />
                    ✔ Location Verified
                  </span>
                )}
              </div>
            )}

            {/* Consent Checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="consent-employee"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 cursor-pointer accent-gold h-4 w-4"
              />
              <label htmlFor="consent-employee" className="text-[10px] text-slate-400 cursor-pointer select-none leading-normal">
                I consent to storing my home address and location for HR and employment records.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase"
          >
            {loading ? (
              <>
                <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                Creating Account...
              </>
            ) : (
              <>
                Complete Registration
                <GoogleIcon name="arrow_forward" size={14} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
