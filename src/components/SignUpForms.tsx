'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import GoogleIcon from './GoogleIcon';
import { DEPARTMENTS } from '@/constants/departments';

const TOP_LEVEL_DEPARTMENTS = [
  "Property Department",
  "IT Department",
  "HR Department",
  "Accounts Department",
  "Marketing Department",
  "Purchase Department",
  "Security Department",
  "Engineering Department",
  "Reservation Department",
  "Admin Department"
];

const DEPARTMENT_MAP: Record<string, {
  categories: string[];
  designations: Record<string, string[]>;
  showProperty: boolean;
  categoryLabel?: string;
}> = {
  "Property Department": {
    showProperty: true,
    categoryLabel: "Operational Category",
    categories: [
      "Property Manager",
      "Front Office",
      "GRA",
      "GRE",
      "Kitchen",
      "Housekeeping",
      "F&B Service",
      "Maintenance",
      "Security",
      "Laundry",
      "Reservation"
    ],
    designations: {
      "Property Manager": ["Property Manager", "Assistant Property Manager", "General Manager"],
      "Front Office": ["Front Office Executive", "Front Office Associate", "Receptionist", "Front Office Manager"],
      "GRA": ["Guest Relation Associate", "Guest Relation Specialist"],
      "GRE": ["Guest Relation Executive", "Guest Relation Supervisor"],
      "Kitchen": ["Commi I", "Commi II", "Chef de Partie", "Sous Chef", "Executive Chef"],
      "Housekeeping": ["Housekeeping Executive", "Housekeeping Supervisor", "Housekeeping Attendant"],
      "F&B Service": ["F&B Service Associate", "F&B Service Executive", "F&B Service Manager"],
      "Maintenance": ["Maintenance Executive", "Maintenance Engineer", "Maintenance Manager"],
      "Security": ["Security Guard", "Security Supervisor", "Security Manager"],
      "Laundry": ["Laundry Attendant", "Laundry Supervisor"],
      "Reservation": ["Reservation Executive", "Reservation Agent", "Reservation Supervisor"]
    }
  },
  "IT Department": {
    showProperty: false,
    categoryLabel: "IT Category",
    categories: [
      "Software Development",
      "Web Development",
      "App Development",
      "Digital Marketing",
      "UI/UX Design",
      "QA & Testing",
      "Technical Support",
      "Network & Security"
    ],
    designations: {
      "Web Development": ["Junior Web Developer", "Web Developer", "Senior Web Developer", "Lead Web Developer"],
      "App Development": ["Junior App Developer", "App Developer", "Senior App Developer", "Lead App Developer"],
      "Software Development": ["Junior Software Engineer", "Software Engineer", "Senior Software Engineer", "Technical Lead"],
      "Digital Marketing": ["Digital Marketing Executive", "SEO Executive", "Social Media Manager", "Digital Marketing Manager"],
      "UI/UX Design": ["UI/UX Designer", "Senior UI/UX Designer", "UI/UX Lead"],
      "QA & Testing": ["QA Engineer", "Senior QA Engineer", "QA Lead"],
      "Technical Support": ["IT Support Executive", "Senior IT Support Executive", "IT Manager"],
      "Network & Security": ["Network Engineer", "Security Engineer", "Network Manager"]
    }
  },
  "HR Department": {
    showProperty: false,
    categoryLabel: "HR Category",
    categories: [
      "Recruitment",
      "Payroll",
      "Employee Relations",
      "Training & Development",
      "HR Operations"
    ],
    designations: {
      "Recruitment": ["Recruiter", "Senior Recruiter", "Recruitment Manager"],
      "Payroll": ["Payroll Specialist", "Payroll Analyst", "Payroll Manager"],
      "Employee Relations": ["Employee Relations Officer", "Employee Relations Specialist", "Employee Relations Manager"],
      "Training & Development": ["Trainer", "Senior Trainer", "Training Manager"],
      "HR Operations": ["HR Executive", "Senior HR Executive", "HR Manager", "Senior HR Manager", "HR Generalist"]
    }
  },
  "Accounts Department": {
    showProperty: false,
    categoryLabel: "Finance & Accounts Category",
    categories: [
      "Billing",
      "Accounts Payable",
      "Accounts Receivable",
      "Auditing",
      "Finance & Tax"
    ],
    designations: {
      "Billing": ["Billing Clerk", "Billing Specialist", "Billing Supervisor"],
      "Accounts Payable": ["AP Clerk", "AP Specialist", "AP Supervisor"],
      "Accounts Receivable": ["AR Clerk", "AR Specialist", "AR Supervisor"],
      "Auditing": ["Internal Auditor", "Senior Auditor", "Audit Manager"],
      "Finance & Tax": ["Finance Executive", "Financial Analyst", "Tax Executive", "Tax Consultant", "Finance Manager"]
    }
  },
  "Marketing Department": {
    showProperty: false,
    categoryLabel: "Marketing Category",
    categories: ["Digital Marketing", "Brand Management", "Public Relations", "Content Strategy", "Market Research"],
    designations: {
      "Digital Marketing": ["SEO Executive", "PPC Specialist", "Digital Marketing Manager"],
      "Brand Management": ["Brand Associate", "Brand Manager", "Senior Brand Manager"],
      "Public Relations": ["PR Executive", "PR Manager", "Communications Lead"],
      "Content Strategy": ["Content Writer", "Copywriter", "Content Manager"],
      "Market Research": ["Research Analyst", "Market Analyst", "Research Manager"]
    }
  },
  "Purchase Department": {
    showProperty: false,
    categoryLabel: "Purchase Category",
    categories: ["Sourcing", "Inventory Control", "Vendor Management", "Logistics", "Procurement"],
    designations: {
      "Sourcing": ["Sourcing Agent", "Sourcing Specialist", "Sourcing Manager"],
      "Inventory Control": ["Inventory Clerk", "Inventory Controller", "Inventory Manager"],
      "Vendor Management": ["Vendor Coordinator", "Vendor Relations Manager"],
      "Logistics": ["Logistics Executive", "Logistics Coordinator", "Logistics Manager"],
      "Procurement": ["Procurement Officer", "Procurement Specialist", "Procurement Manager"]
    }
  },
  "Security Department": {
    showProperty: false,
    categoryLabel: "Security Category",
    categories: ["Physical Security", "Surveillance", "Loss Prevention", "Emergency Response"],
    designations: {
      "Physical Security": ["Security Guard", "Security Supervisor", "Security Inspector"],
      "Surveillance": ["CCTV Operator", "Surveillance Supervisor"],
      "Loss Prevention": ["Loss Prevention Officer", "Loss Prevention Manager"],
      "Emergency Response": ["Safety Officer", "Emergency Coordinator", "Safety Manager"]
    }
  },
  "Engineering Department": {
    showProperty: false,
    categoryLabel: "Engineering Category",
    categories: ["Civil Maintenance", "Electrical", "HVAC", "Plumbing", "General Engineering"],
    designations: {
      "Civil Maintenance": ["Mason", "Carpenter", "Civil Supervisor", "Civil Engineer"],
      "Electrical": ["Electrician", "Senior Electrician", "Electrical Engineer"],
      "HVAC": ["AC Technician", "HVAC Engineer", "HVAC Manager"],
      "Plumbing": ["Plumber", "Plumbing Supervisor"],
      "General Engineering": ["Technician", "Maintenance Engineer", "Chief Engineer"]
    }
  },
  "Reservation Department": {
    showProperty: false,
    categoryLabel: "Reservation Category",
    categories: ["Room Reservations", "Event Booking", "Ticketing", "Customer Relations"],
    designations: {
      "Room Reservations": ["Reservation Agent", "Reservation Executive", "Reservation Manager"],
      "Event Booking": ["Event Coordinator", "Event Booking Executive", "Event Manager"],
      "Ticketing": ["Ticketing Agent", "Ticketing Executive"],
      "Customer Relations": ["Customer Care Agent", "CRM Executive", "Guest Relations Executive"]
    }
  },
  "Admin Department": {
    showProperty: false,
    categoryLabel: "Admin Category",
    categories: ["General Administration", "Facilities Management", "Liaison", "Office Support"],
    designations: {
      "General Administration": ["Admin Assistant", "Admin Executive", "Admin Manager", "General Manager"],
      "Facilities Management": ["Facilities Executive", "Facilities Manager"],
      "Liaison": ["Liaison Officer", "Public Relations Executive"],
      "Office Support": ["Office Assistant", "Receptionist", "Data Entry Operator"]
    }
  }
};

const getNormalizedDeptKey = (dept: string): string => {
  if (!dept) return "";
  const d = dept.toLowerCase().trim();
  
  if (d.includes("property department") || d.includes("property operations") || d.includes("property manager") || d.includes("operational manager") || d.includes("f&b manager") || d.includes("front office") || d.includes("gre") || d.includes("gra") || d.includes("housekeeping") || d.includes("maintenance") || d.includes("laundry") || d.includes("kitchen") || d.includes("f&b service")) {
    return "Property Department";
  }
  if (d === "it" || d.includes("it department") || d.includes("information technology") || d.includes("software") || d.includes("technical")) {
    return "IT Department";
  }
  if (d === "hr" || d.includes("human resources") || d.includes("hr department") || d.includes("recruitment")) {
    return "HR Department";
  }
  if (d === "accounts" || d === "finance" || d.includes("accounts department") || d.includes("finance department") || d.includes("billing")) {
    return "Accounts Department";
  }
  if (d.includes("marketing") || d.includes("sales")) {
    return "Marketing Department";
  }
  if (d.includes("purchase") || d.includes("procurement") || d.includes("sourcing")) {
    return "Purchase Department";
  }
  if (d.includes("security")) {
    return "Security Department";
  }
  if (d.includes("engineering") || d.includes("electrical") || d.includes("maintenance")) {
    return "Engineering Department";
  }
  if (d.includes("reservation") || d.includes("ticketing")) {
    return "Reservation Department";
  }
  if (d.includes("admin") || d.includes("compliance") || d.includes("general")) {
    return "Admin Department";
  }
  
  return "IT Department";
};

const getCategoriesForDept = (dept: string): string[] => {
  const key = getNormalizedDeptKey(dept);
  return DEPARTMENT_MAP[key]?.categories || [];
};

const getCategoryLabel = (dept: string): string => {
  const key = getNormalizedDeptKey(dept);
  return DEPARTMENT_MAP[key]?.categoryLabel || "Category";
};

const getDesignationsForCategory = (dept: string, category: string): string[] => {
  if (!dept || !category) return [];
  const key = getNormalizedDeptKey(dept);
  const designationsMap = DEPARTMENT_MAP[key]?.designations;
  if (!designationsMap) return [];
  return designationsMap[category] || [];
};

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  property: z.string().optional(),
  department: z.string().min(1, 'Department selection is required'),
  category: z.string().min(1, 'Category selection is required'),
  designation: z.string().min(1, 'Designation selection is required'),
  role: z.string().min(1, 'Role selection is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  const normDept = getNormalizedDeptKey(data.department);
  if (normDept === 'Property Department') {
    return !!data.property && data.property.length > 0;
  }
  return true;
}, {
  message: "Property selection is required for Property Department",
  path: ["property"],
});

const employeeRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  property: z.string().optional(),
  department: z.string().min(1, 'Department selection is required'),
  category: z.string().min(1, 'Category selection is required'),
  role: z.string().default('EMPLOYEE'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  reportingManager: z.string().min(1, 'Reporting Manager is required'),
  employmentType: z.string().min(1, 'Employment status is required'),
  designation: z.string().min(1, 'Designation is required'),
  salary: z.string().min(1, 'Salary details are required'),
  address: z.string().min(5, 'Address details are required'),
  aadhaarNumber: z.string().min(12, 'Aadhaar number must be 12 digits').max(12, 'Aadhaar number must be 12 digits'),
  panNumber: z.string().min(10, 'PAN number must be 10 characters').max(10, 'PAN number must be 10 characters'),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining Date is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  const normDept = getNormalizedDeptKey(data.department);
  if (normDept === 'Property Department') {
    return !!data.property && data.property.length > 0;
  }
  return true;
}, {
  message: "Property selection is required for Property Department",
  path: ["property"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface SignUpFormsProps {
  onRegisterSuccess: () => void;
}

export default function SignUpForms({ onRegisterSuccess }: SignUpFormsProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [signupType, setSignupType] = useState<'manager' | 'employee'>('manager');

  // Password visibility states
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleGeocodeAddress = async () => {
    if (!homeAddress && !homeCity && !homeState) {
      alert('Please fill at least the Address, City, and State fields to search.');
      return;
    }
    const queryStr = `${homeAddress} ${homeCity} ${homeState} ${homePincode}`.trim();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        setHomeLatitude(lat);
        setHomeLongitude(lng);

        const addr = first.address || {};
        setHomeState(addr.state || homeState || '');
        setHomeDistrict(addr.county || addr.district || addr.state_district || homeDistrict || '');
        setHomeCity(addr.city || addr.town || addr.village || addr.suburb || homeCity || '');
        setHomePincode(addr.postcode || homePincode || '');
        if (first.display_name) {
          setHomeAddress(first.display_name);
        }

        setLocationVerified(true);

        if (mapInstance) {
          mapInstance.setView([lat, lng], 15);
          if (markerInstance) {
            markerInstance.setLatLng([lat, lng]);
          } else {
            const newMarker = L.marker([lat, lng]).addTo(mapInstance);
            setMarkerInstance(newMarker);
          }
        }
      } else {
        alert('Could not find location. Please check the address details.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Failed to search address. Please try again.');
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

  const [departmentsList, setDepartmentsList] = useState<string[]>(TOP_LEVEL_DEPARTMENTS);

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

    if (!homeAddress || !homeState || !homeDistrict || !homeCity || !homePincode) {
      setErrorMsg('Please fill in all home location address fields (Address, State, District, City, Pincode).');
      setLoading(false);
      return;
    }
    if (!homeLatitude || !homeLongitude || !locationVerified) {
      setErrorMsg('Please pin/verify your location on the map.');
      setLoading(false);
      return;
    }
    if (!consentChecked) {
      setErrorMsg('You must check the consent box to proceed with registration.');
      setLoading(false);
      return;
    }

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
      verifiedAt: new Date().toISOString()
    };

    const payload = {
      ...values,
      documents,
      homeLocation
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

    if (!homeAddress || !homeState || !homeDistrict || !homeCity || !homePincode) {
      setErrorMsg('Please fill in all home location address fields (Address, State, District, City, Pincode).');
      setLoading(false);
      return;
    }
    if (!homeLatitude || !homeLongitude || !locationVerified) {
      setErrorMsg('Please pin/verify your location on the map.');
      setLoading(false);
      return;
    }
    if (!consentChecked) {
      setErrorMsg('You must check the consent box to proceed with registration.');
      setLoading(false);
      return;
    }
    
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
      verifiedAt: new Date().toISOString()
    };

    const payload = {
      ...values,
      role: 'EMPLOYEE', // Hardcoded for self-signing employees
      documents,
      homeLocation
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
          onClick={() => {
            setSignupType('manager');
            setErrorMsg(null);
          }}
          className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer font-bold ${
            signupType === 'manager' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Manager Sign Up
        </button>
        <button
          type="button"
          onClick={() => {
            setSignupType('employee');
            setErrorMsg(null);
          }}
          className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer font-bold ${
            signupType === 'employee' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
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
            <label className="block text-slate-400 font-semibold mb-1">Email *</label>
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
                <label className="block text-slate-400 font-semibold mb-1">Department *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="work" size={14} />
                  </span>
                  <select
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left"
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
              {selectedDeptSignup && getNormalizedDeptKey(selectedDeptSignup) === 'Property Department' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Property *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                      <GoogleIcon name="corporate_fare" size={14} />
                    </span>
                    <select
                      style={{ paddingLeft: '40px' }}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left"
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
                      {getCategoryLabel(selectedDeptSignup)} *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <GoogleIcon name="category" size={14} />
                      </span>
                      <select
                        style={{ paddingLeft: '40px' }}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left"
                        {...registerSignup('category')}
                      >
                        <option value="" className="bg-slate-950 text-slate-400">
                          Select {getCategoryLabel(selectedDeptSignup)}
                        </option>
                        {getCategoriesForDept(selectedDeptSignup).map((cat) => (
                          <option key={cat} value={cat} className="bg-slate-950 text-white">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    {signupErrors.category && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.category.message}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Designation *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <GoogleIcon name="badge" size={14} />
                      </span>
                      <select
                        style={{ paddingLeft: '40px' }}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left"
                        {...registerSignup('designation')}
                      >
                        <option value="" className="bg-slate-950 text-slate-400">Select Designation</option>
                        {getDesignationsForCategory(selectedDeptSignup, selectedCategorySignup).map((des) => (
                          <option key={des} value={des} className="bg-slate-950 text-white">
                            {des}
                          </option>
                        ))}
                      </select>
                    </div>
                    {signupErrors.designation && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.designation.message}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Role *</label>
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

          {/* Home Location Registration */}
          <div className="space-y-4 pt-4 border-t border-slate-800/60 mt-4">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Home Location Registration</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">Home Address *</label>
                <textarea
                  rows={2}
                  placeholder="House No, Street Name, Locality"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">State *</label>
                <input
                  type="text"
                  placeholder="e.g. Jharkhand"
                  value={homeState}
                  onChange={(e) => setHomeState(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">District *</label>
                <input
                  type="text"
                  placeholder="e.g. Ranchi"
                  value={homeDistrict}
                  onChange={(e) => setHomeDistrict(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">City *</label>
                <input
                  type="text"
                  placeholder="e.g. Ranchi"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pincode *</label>
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
              <label className="block text-slate-400 font-semibold mb-1">Location Map Preview *</label>
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
              <label className="block text-slate-400 mb-1">Email *</label>
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
                <input
                  type="password"
                  placeholder="••••••••"
                  defaultValue=""
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('password')}
                />
                {empSignupErrors.password?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.password.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  defaultValue=""
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('confirmPassword')}
                />
                {empSignupErrors.confirmPassword?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.confirmPassword.message}</p>}
              </div>
            </div>
          </div>

          {/* Job & Hotel Scoping */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Job & Hotel Scoping</h5>
            
            {/* Department Section */}
            <div>
              <label className="block text-slate-400 mb-1">Department *</label>
              <select
                className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer"
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
            {selectedDeptEmpSignup && getNormalizedDeptKey(selectedDeptEmpSignup) === 'Property Department' && (
              <div>
                <label className="block text-slate-400 mb-1">Property Selection *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    <GoogleIcon name="corporate_fare" size={14} />
                  </span>
                  <select
                    style={{ paddingLeft: '40px' }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer input-with-icon-left"
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
                  <label className="block text-slate-400 mb-1">{getCategoryLabel(selectedDeptEmpSignup)} *</label>
                  <select
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                    {...registerEmpSignup('category')}
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Select {getCategoryLabel(selectedDeptEmpSignup)}</option>
                    {getCategoriesForDept(selectedDeptEmpSignup).map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-950 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  {empSignupErrors.category?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.category.message}</p>}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Designation *</label>
                  <select
                    className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                    {...registerEmpSignup('designation')}
                  >
                    <option value="" className="bg-slate-950 text-slate-400">Select Designation</option>
                    {getDesignationsForCategory(selectedDeptEmpSignup, selectedCategoryEmpSignup).map((des) => (
                      <option key={des} value={des} className="bg-slate-950 text-white">
                        {des}
                      </option>
                    ))}
                  </select>
                  {empSignupErrors.designation?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.designation.message}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Reporting Manager *</label>
                <input
                  type="text"
                  placeholder="Manager Name"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('reportingManager')}
                />
                {empSignupErrors.reportingManager?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.reportingManager.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Employment Status *</label>
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
                <label className="block text-slate-400 mb-1">Joining Date *</label>
                <input
                  type="date"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('joiningDate')}
                />
                {empSignupErrors.joiningDate?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.joiningDate.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Salary Structure *</label>
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
              <label className="block text-slate-400 mb-1">Address *</label>
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
                <label className="block text-slate-400 mb-1">Aadhaar Card *</label>
                <input
                  type="text"
                  placeholder="12-digit number"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                  {...registerEmpSignup('aadhaarNumber')}
                />
                {empSignupErrors.aadhaarNumber?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.aadhaarNumber.message}</p>}
              </div>
              <div>
                <label className="block text-slate-400 mb-1">PAN Card *</label>
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

          {/* Home Location Registration */}
          <div className="space-y-4 pt-4 border-t border-slate-800/60 mt-4">
            <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Home Location Registration</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">Home Address *</label>
                <textarea
                  rows={2}
                  placeholder="House No, Street Name, Locality"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">State *</label>
                <input
                  type="text"
                  placeholder="e.g. Jharkhand"
                  value={homeState}
                  onChange={(e) => setHomeState(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">District *</label>
                <input
                  type="text"
                  placeholder="e.g. Ranchi"
                  value={homeDistrict}
                  onChange={(e) => setHomeDistrict(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">City *</label>
                <input
                  type="text"
                  placeholder="e.g. Ranchi"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pincode *</label>
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
              <label className="block text-slate-400 font-semibold mb-1">Location Map Preview *</label>
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
