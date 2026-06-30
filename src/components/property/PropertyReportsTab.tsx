'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import GoogleIcon from '@/components/GoogleIcon';

// Predefined operational report categories
const PREDEFINED_CATEGORIES = [
  { id: 'DAILY_SALES_REPORT', name: 'Daily Sales Report', icon: 'receipt_long', color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'CASHBOOK', name: 'Cashbook', icon: 'account_balance_wallet', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'POLICE_REPORT', name: 'Police Report', icon: 'local_police', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'MAINTENANCE_REPORT', name: 'Maintenance Report', icon: 'build', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 'HOUSEKEEPING_REPORT', name: 'Housekeeping Report', icon: 'clean_hands', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'PURCHASE_REPORT', name: 'Purchase Report', icon: 'shopping_cart', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'COMPLAINT_REPORT', name: 'Complaint Report', icon: 'report_problem', color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'METER_READING_PHOTO', name: 'Meter Reading', icon: 'electric_meter', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'KITCHEN_REPORT', name: 'Kitchen Report', icon: 'restaurant', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'INVENTORY_REPORT', name: 'Inventory Report', icon: 'inventory', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'ELECTRICITY_REPORT', name: 'Electricity Report', icon: 'bolt', color: 'text-blue-500', bg: 'bg-blue-600/10' },
  { id: 'WATER_REPORT', name: 'Water Report', icon: 'water_drop', color: 'text-sky-400', bg: 'bg-sky-500/10' },
];

interface FileCardProps {
  reportId: string;
  file: any;
  user: any;
  setLightboxImage: (url: string | null) => void;
  handleShareFile: (url: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({
  reportId,
  file,
  user,
  setLightboxImage,
  handleShareFile
}) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isImg = !!file.fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|avif|heic|heif)(\?.*)?$/);

  const loadFileUrl = async () => {
    if (fileUrl) return fileUrl;
    setLoading(true);
    try {
      console.log('[FileCard] Loading fileUrl on-demand for reportId:', reportId, 'file:', file.fileName);
      const res = await api.get(`/property-reports?id=${reportId}&includeFileUrl=true`);
      const matchedReport = res?.reports?.[0] || res?.data?.reports?.[0] || res?.data?.[0];
      if (matchedReport && matchedReport.files) {
        const matchedFile = matchedReport.files.find((f: any) => f.fileName === file.fileName);
        if (matchedFile && matchedFile.fileUrl) {
          setFileUrl(matchedFile.fileUrl);
          return matchedFile.fileUrl;
        }
      }
    } catch (err) {
      console.error('[FileCard] Failed to load fileUrl', err);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    if (isImg) {
      loadFileUrl();
    }
  }, [reportId]);

  const handlePreviewClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = await loadFileUrl();
    if (url) {
      setLightboxImage(url);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    if (!fileUrl) {
      e.preventDefault();
      const url = await loadFileUrl();
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = await loadFileUrl();
    if (url) {
      handleShareFile(url);
    }
  };

  return (
    <div className="flex flex-col bg-slate-955 border border-slate-855 rounded-xl overflow-hidden p-2.5 space-y-2">
      <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center group">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-[8px] text-slate-500">Loading preview...</span>
          </div>
        ) : isImg && fileUrl ? (
          <img src={fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <GoogleIcon name={isImg ? "image" : "description"} size={28} className="text-slate-400 mb-1" />
            <span className="text-[10px] text-slate-500 break-all truncate max-w-[150px]">{file.fileName}</span>
          </div>
        )}
        
        {!loading && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            {isImg ? (
              <button
                onClick={handlePreviewClick}
                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="View Image"
              >
                <GoogleIcon name="visibility" size={14} />
              </button>
            ) : (
              <a
                href={fileUrl || '#'}
                onClick={handleDownloadClick}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="View file"
              >
                <GoogleIcon name="visibility" size={14} className="m-auto" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-white font-semibold truncate block w-full">{file.fileName}</span>
        <span className="text-[9px] text-slate-500 block">{new Date(file.uploadedAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>

      <div className="flex border-t border-slate-900 pt-2 gap-1.5">
        <a
          href={fileUrl || '#'}
          onClick={handleDownloadClick}
          download={file.fileName}
          className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white rounded text-[10px] font-bold text-center flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <GoogleIcon name="download" size={12} /> {loading ? 'Loading...' : 'Download'}
        </a>
        <button
          onClick={handleShareClick}
          className="py-1 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer"
          title="Share"
        >
          <GoogleIcon name="share" size={12} />
        </button>
      </div>
    </div>
  );
};

export default function PropertyReportsTab() {
  const { user } = useAuthStore();

  // Screen States: 'properties' | 'categories' | 'detail' | 'upload-date' | 'view-date'
  const [viewState, setViewState] = useState<'properties' | 'categories' | 'detail' | 'upload-date' | 'view-date'>('properties');

  // Master Data
  const [hotels, setHotels] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>(PREDEFINED_CATEGORIES);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedFolderDate, setSelectedFolderDate] = useState<string>('');

  // Toggles & Filters
  const [detailTab, setDetailTab] = useState<'upload' | 'view'>('upload');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  
  // Get default ISO local date string
  const getTodayString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [filterDate, setFilterDate] = useState<string>(getTodayString());
  const [filterStartDate, setFilterStartDate] = useState<string>(getTodayString());
  const [filterEndDate, setFilterEndDate] = useState<string>(getTodayString());
  const [appliedDates, setAppliedDates] = useState<string[]>([]);

  // Search properties dropdown
  const [hotelSearch, setHotelSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; name: string }[]>([]);
  const [remarks, setRemarks] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // File Viewer / Delete Request State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requestingDeleteId, setRequestingDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [folderReports, setFolderReports] = useState<any[]>([]);
  const [loadingFolder, setLoadingFolder] = useState(false);

  // Load hotels
  const fetchHotels = async () => {
    setLoading(true);
    try {
      console.log('[ReportsTab] Fetching hotels from /hotels/public...');
      const res = await api.get('/hotels/public');
      console.log('[ReportsTab] fetchHotels raw response:', res);
      
      let availableHotels = res?.data?.hotels || res?.data?.data?.hotels || res?.hotels || [];
      console.log('[ReportsTab] Resolved available hotels list:', availableHotels);
      console.log('[ReportsTab] Logged-in user auth status:', user);

      const isCentral = user?.role === 'ROOT_ADMIN' || user?.department === 'Central Team';
      if (!isCentral && user?.hotel) {
        const userHotelId = typeof user.hotel === 'object' ? (user.hotel as any)._id : user.hotel;
        console.log('[ReportsTab] Filtering available properties by user assigned hotel ID:', userHotelId);
        availableHotels = availableHotels.filter((h: any) => h._id === userHotelId);
      }
      console.log('[ReportsTab] Filtered available hotels list:', availableHotels);
      setHotels(availableHotels);

      // Auto-select if last selected property exists in local storage and is valid
      const cached = localStorage.getItem('oxy_last_selected_property');
      console.log('[ReportsTab] Cached hotel ID in localStorage:', cached);
      if (cached && availableHotels.some((h: any) => h._id === cached)) {
        console.log('[ReportsTab] Restoring cached hotel selection:', cached);
        setSelectedHotelId(cached);
        setViewState('categories');
        fetchAllHotelReports(cached);
      } else if (availableHotels.length === 1) {
        const singleId = availableHotels[0]._id;
        console.log('[ReportsTab] Auto-selecting single available property:', singleId);
        setSelectedHotelId(singleId);
        localStorage.setItem('oxy_last_selected_property', singleId);
        setViewState('categories');
        fetchAllHotelReports(singleId);
      } else {
        console.log('[ReportsTab] Directing user to property selection screen');
        setViewState('properties');
      }
    } catch (err) {
      console.error('[ReportsTab] Failed to load hotels', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all reports for the selected hotel to calculate category stats and dynamically detect extra categories
  const fetchAllHotelReports = async (hotelId: string) => {
    if (!hotelId) return;
    try {
      console.log('[ReportsTab] Fetching all hotel reports for hotelId:', hotelId);
      const res = await api.get(`/property-reports?hotelId=${hotelId}`);
      console.log('[ReportsTab] fetchAllHotelReports raw response:', res);
      const reportsList = res?.reports || res?.data?.reports || res?.data || [];
      console.log('[ReportsTab] Resolved reports list count:', reportsList.length);
      setReports(reportsList);
    } catch (err) {
      console.error('[ReportsTab] Failed to load all reports', err);
    }
  };

  const fetchFolderReports = async (dateStr: string) => {
    if (!selectedHotelId || !selectedCategory?.id || !dateStr) return;
    setLoadingFolder(true);
    try {
      console.log('[ReportsTab] Fetching folder reports metadata for date:', dateStr);
      const res = await api.get(`/property-reports?hotelId=${selectedHotelId}&category=${selectedCategory.id}&reportDate=${dateStr}`);
      console.log('[ReportsTab] fetchFolderReports raw response:', res);
      const list = res?.reports || res?.data?.reports || res?.data || [];
      setFolderReports(list);
    } catch (err) {
      console.error('[ReportsTab] Failed to load folder reports', err);
    } finally {
      setLoadingFolder(false);
    }
  };

  // Pre-fetch hotels when user auth is loaded
  useEffect(() => {
    if (user) {
      fetchHotels();
    }
  }, [user]);

  // Dropdown outside click handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Scan reports to find any additional custom categories not in our predefined list
  useEffect(() => {
    const dynamicCats = [...PREDEFINED_CATEGORIES];
    reports.forEach(r => {
      const catId = r.category || r.reportType;
      if (catId && !dynamicCats.some(c => c.id === catId)) {
        const formattedName = catId
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        dynamicCats.push({
          id: catId,
          name: formattedName,
          icon: 'description',
          color: 'text-slate-400',
          bg: 'bg-slate-500/10'
        });
      }
    });
    setAllCategories(dynamicCats);
  }, [reports]);

  // Handle changing hotels
  const handleHotelSelect = (hotelId: string) => {
    setSelectedHotelId(hotelId);
    localStorage.setItem('oxy_last_selected_property', hotelId);
    setDropdownOpen(false);
    setViewState('categories');
    fetchAllHotelReports(hotelId);
  };

  // Date Generators for folders
  const getPrecedingDates = (baseDateStr: string, count = 5) => {
    const dates = [];
    const baseDate = new Date(baseDateStr);
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    let limit = 31; // Safety limit
    const current = new Date(end);
    while (current >= start && limit > 0) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() - 1);
      limit--;
    }
    return dates;
  };

  const getLocalDateString = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleApplyFilters = () => {
    let datesList: string[] = [];
    if (dateMode === 'single') {
      datesList = getPrecedingDates(filterDate);
    } else {
      datesList = getDatesInRange(filterStartDate, filterEndDate);
    }

    // Add any dates from existing reports in MongoDB for this category
    reports.forEach(r => {
      const matchCategory = r.category === selectedCategory?.id || r.reportType === selectedCategory?.id;
      if (matchCategory) {
        const reportDateStr = getLocalDateString(r.reportDate);
        if (reportDateStr && !datesList.includes(reportDateStr)) {
          datesList.push(reportDateStr);
        }
      }
    });

    // Sort in reverse chronological order
    datesList.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    setAppliedDates(datesList);
  };

  // Initialize dates when entering categories/detail view
  useEffect(() => {
    if (selectedCategory) {
      handleApplyFilters();
    }
  }, [selectedCategory, dateMode, filterDate, filterStartDate, filterEndDate, reports]);

  // Dynamic Category Stats calculation
  const getCategoryStats = () => {
    return allCategories.map(cat => {
      const catReports = reports.filter(r => r.category === cat.id || r.reportType === cat.id);
      const lastUpload = catReports.length > 0 ? catReports[0].uploadedAt || catReports[0].createdAt : null;
      return {
        ...cat,
        count: catReports.length,
        lastUpload
      };
    });
  };

  // Filter reports matching the current category, property, and specific date folder
  const getReportsForFolderDate = (dateStr: string) => {
    return reports.filter(r => {
      const matchCategory = r.category === selectedCategory?.id || r.reportType === selectedCategory?.id;
      if (!matchCategory) return false;
      const reportDateStr = getLocalDateString(r.reportDate);
      return reportDateStr === dateStr;
    });
  };

  // Allowed Formats & File Validation
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xls', '.xlsx'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const validateFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isValidExt = allowedExtensions.includes(ext);
    const isValidMime = allowedMimeTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isValidExt && !isValidMime) {
      alert(`Unsupported file format for "${file.name}". Please upload PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, or XLSX.`);
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert(`File "${file.name}" is too large. Maximum size allowed is 10MB.`);
      return false;
    }
    
    return true;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: any[] = [];
    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        const preview = URL.createObjectURL(file);
        newFiles.push({ file, preview, name: file.name });
      }
    });
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpeg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select or capture at least one file to upload.');
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const selectedHotel = hotels.find(h => h._id === selectedHotelId);
      
      // Compress images and convert to base64 in parallel
      const processedFiles = await Promise.all(
        selectedFiles.map(async (f, idx) => {
          let fileToUpload = f.file;
          if (fileToUpload.type.startsWith('image/')) {
            fileToUpload = await compressImage(fileToUpload);
          }
          const base64 = await convertToBase64(fileToUpload);
          setUploadProgress(10 + Math.floor(((idx + 1) / selectedFiles.length) * 80));
          return { fileUrl: base64, fileName: f.name };
        })
      );

      const payload = {
        category: selectedCategory.id,
        reportDate: selectedFolderDate,
        files: processedFiles,
        remarks,
        hotelId: selectedHotel?._id,
        hotelName: selectedHotel?.name,
        hotelCode: selectedHotel?.hotelCode,
        uploadedBy: user?.id || (user as any)?._id,
        uploadedByRole: user?.role,
        department: user?.department || 'GENERAL'
      };

      await api.post('/property-reports', payload);
      setUploadProgress(100);
      setSelectedFiles([]);
      setRemarks('');
      
      // Reload reports
      await fetchAllHotelReports(selectedHotelId);
      
      alert('✅ Upload successful!');
      setViewState('detail');
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Request Delete Workflow
  const handleRequestDelete = async () => {
    if (!requestingDeleteId || !deleteReason) return;
    setProcessingId(requestingDeleteId);
    try {
      await api.patch(`/property-reports/${requestingDeleteId}/request-delete`, { reason: deleteReason });
      setRequestingDeleteId(null);
      setDeleteReason('');
      await fetchAllHotelReports(selectedHotelId);
      alert('✅ Delete request submitted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to request delete');
    } finally {
      setProcessingId(null);
    }
  };

  // Administrative Delete approvals
  const handleApproveDelete = async (id: string) => {
    if (!confirm('Are you sure you want to approve this deletion? It will be removed from view.')) return;
    setProcessingId(id);
    try {
      await api.patch(`/property-reports/${id}/approve-delete`, {});
      await fetchAllHotelReports(selectedHotelId);
    } catch (err) {
      console.error(err);
      alert('Failed to approve delete');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDelete = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    setProcessingId(id);
    try {
      await api.patch(`/property-reports/${id}/reject-delete`, { reason });
      await fetchAllHotelReports(selectedHotelId);
    } catch (err) {
      console.error(err);
      alert('Failed to reject delete');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('PERMANENT DELETE: This will destroy the record and its logs. Proceed?')) return;
    setProcessingId(id);
    try {
      await api.delete(`/property-reports/${id}`);
      await fetchAllHotelReports(selectedHotelId);
    } catch (err) {
      console.error(err);
      alert('Failed to delete report');
    } finally {
      setProcessingId(null);
    }
  };

  // Clipboard share handler
  const handleShareFile = (fileUrl: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fileUrl);
      alert('✅ File link copied to clipboard!');
    } else {
      alert(`File URL: ${fileUrl}`);
    }
  };

  const getHotelName = (id: string) => {
    return hotels.find(h => h._id === id)?.name || 'Select Property';
  };

  const filteredHotels = hotels.filter(h =>
    h.name.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs">Loading properties...</p>
      </div>
    );
  }

  // ================= RENDER PROPERTIES VIEW =================
  if (viewState === 'properties' || !selectedHotelId) {
    return (
      <div className="mt-6 max-w-lg mx-auto bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <GoogleIcon name="domain" className="text-gold" /> Select Property
        </h2>
        <p className="text-xs text-slate-400 mb-6">Choose a property from the list to view or upload operational reports.</p>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <GoogleIcon name="search" size={18} />
          </div>
          <input
            type="text"
            placeholder="Search hotel property name..."
            value={hotelSearch}
            onChange={(e) => setHotelSearch(e.target.value)}
            className="w-full bg-slate-955 border border-slate-700 pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold transition-all"
          />
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {filteredHotels.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">No properties match your search.</p>
          ) : (
            filteredHotels.map(h => (
              <button
                key={h._id}
                onClick={() => handleHotelSelect(h._id)}
                className="w-full text-left p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850 hover:border-slate-700 hover:text-gold text-sm text-slate-200 transition-all flex items-center justify-between cursor-pointer"
              >
                <span>{h.name}</span>
                <GoogleIcon name="chevron_right" size={18} className="text-slate-650" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ================= RENDER CATEGORIES SCREEN =================
  if (viewState === 'categories') {
    const categoryStats = getCategoryStats();
    return (
      <div className="mt-6 space-y-6">
        {/* Selected Property Header */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold">
              <GoogleIcon name="domain" size={22} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Property</span>
              <h2 className="text-sm font-bold text-white">{getHotelName(selectedHotelId)}</h2>
            </div>
          </div>
          {(user?.role === 'ROOT_ADMIN' || user?.department === 'Central Team') && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-4 py-2 border border-slate-700 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer h-[36px]"
              >
                Change Property <GoogleIcon name="expand_more" size={16} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-950 border border-slate-805 rounded-2xl shadow-2xl z-50 p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={hotelSearch}
                    onChange={(e) => setHotelSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-855 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-gold"
                  />
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {filteredHotels.map(h => (
                      <button
                        key={h._id}
                        onClick={() => handleHotelSelect(h._id)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          h._id === selectedHotelId ? 'bg-gold/10 text-gold font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <span>{h.name}</span>
                        {h._id === selectedHotelId && <GoogleIcon name="check" size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Categories Grid */}
        <div>
          <div className="mb-4">
            <h3 className="text-md font-bold text-white">Daily Operations Folders</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select a category below to upload documents or view existing logs.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryStats.map(cat => (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setViewState('detail');
                }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-650 hover:bg-slate-850/30 transition-all group flex flex-col h-full cursor-pointer relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bg} ${cat.color}`}>
                    <GoogleIcon name={cat.icon} size={20} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-white leading-none">{cat.count}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Files</span>
                  </div>
                </div>
                
                <h4 className="font-bold text-slate-100 group-hover:text-gold transition-colors text-sm truncate">{cat.name}</h4>
                <p className="text-[10px] text-slate-500 mt-2 truncate">
                  {cat.lastUpload ? `Last: ${new Date(cat.lastUpload).toLocaleDateString()}` : 'No uploads'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER REPORT DETAILS SCREEN =================
  if (viewState === 'detail') {
    return (
      <div className="mt-6 space-y-6">
        {/* Navigation Breadcrumb & Back arrow */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setViewState('categories')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <GoogleIcon name="arrow_back" size={16} /> Back to Folders
          </button>
          
          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
            {getHotelName(selectedHotelId)}
          </span>
        </div>

        {/* Title details */}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
              <GoogleIcon name={selectedCategory?.icon || 'folder'} size={18} />
            </span>
            {selectedCategory?.name}
          </h2>
        </div>

        {/* Tab switcher toggle buttons */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 max-w-xs">
          <button
            onClick={() => setDetailTab('upload')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              detailTab === 'upload' ? 'bg-gold text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GoogleIcon name="cloud_upload" size={14} /> Upload
          </button>
          <button
            onClick={() => setDetailTab('view')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              detailTab === 'view' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GoogleIcon name="visibility" size={14} /> View Files
          </button>
        </div>

        {/* Date Filter & folders listing */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col gap-4">
            {/* Filter Toggle selection */}
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-350 cursor-pointer">
                <input
                  type="radio"
                  checked={dateMode === 'single'}
                  onChange={() => setDateMode('single')}
                  className="accent-gold h-4 w-4"
                />
                Select Date
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-350 cursor-pointer">
                <input
                  type="radio"
                  checked={dateMode === 'range'}
                  onChange={() => setDateMode('range')}
                  className="accent-gold h-4 w-4"
                />
                From Date - To Date
              </label>
            </div>

            {/* Inputs & Apply button row */}
            <div className="flex flex-wrap items-end gap-3.5">
              {dateMode === 'single' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Date</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-slate-955 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-gold outline-none h-[38px] min-w-[150px]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">From Date</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="bg-slate-955 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-gold outline-none h-[38px] min-w-[140px]"
                    />
                  </div>
                  <span className="text-slate-600 mt-5 font-bold">-</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">To Date</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="bg-slate-955 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:border-gold outline-none h-[38px] min-w-[140px]"
                    />
                  </div>
                </div>
              )}
              
              <button
                onClick={handleApplyFilters}
                className="px-5 py-2.5 bg-gold hover:bg-gold-light text-slate-955 font-bold text-xs rounded-xl transition-all cursor-pointer h-[38px]"
              >
                Apply
              </button>
            </div>
          </div>

          {/* DATE WISE FOLDERS HEADER */}
          <div className="border-t border-slate-800/80 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">Date Wise Folders</h3>
            <div className="space-y-2">
              {appliedDates.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <GoogleIcon name="folder_open" size={28} className="opacity-40" />
                  <span>No date folders generated. Adjust date filters and click Apply.</span>
                </div>
              ) : (
                appliedDates.map(dateStr => {
                  const dateReports = getReportsForFolderDate(dateStr);
                  const filesCount = dateReports.reduce((sum, r) => sum + (r.files?.length || 0), 0);
                  const formattedDisplayDate = new Date(dateStr).toLocaleDateString('en-US', {
                    month: '2-digit', day: '2-digit', year: 'numeric'
                  });

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setSelectedFolderDate(dateStr);
                        if (detailTab === 'view') {
                          setViewState('view-date');
                          fetchFolderReports(dateStr);
                        } else {
                          setViewState('upload-date');
                        }
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-955/40 hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-850 text-slate-400 group-hover:text-gold transition-colors flex items-center justify-center">
                          <GoogleIcon name="folder" size={20} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{formattedDisplayDate}</span>
                          <span className="text-[10px] text-slate-500 block">{filesCount} files uploaded</span>
                        </div>
                      </div>

                      {/* Right quick actions context dependent */}
                      {detailTab === 'upload' ? (
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedFolderDate(dateStr);
                              setViewState('upload-date');
                              // Trigger camera input delay click
                              setTimeout(() => cameraInputRef.current?.click(), 100);
                            }}
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Take Photo"
                          >
                            <GoogleIcon name="photo_camera" size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFolderDate(dateStr);
                              setViewState('upload-date');
                              // Trigger file browse click
                              setTimeout(() => fileInputRef.current?.click(), 100);
                            }}
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Attach File"
                          >
                            <GoogleIcon name="attachment" size={16} />
                          </button>
                        </div>
                      ) : (
                        <GoogleIcon name="chevron_right" size={20} className="text-slate-650 group-hover:text-white transition-colors" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER UPLOAD DATE SCREEN =================
  if (viewState === 'upload-date') {
    const dateReports = getReportsForFolderDate(selectedFolderDate);
    const formattedDisplayDate = new Date(selectedFolderDate).toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });

    return (
      <div className="mt-6 space-y-6">
        {/* Navigation back and header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              setSelectedFiles([]);
              setViewState('detail');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <GoogleIcon name="arrow_back" size={16} /> Back to Folders
          </button>
          
          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
            Upload - {formattedDisplayDate}
          </span>
        </div>

        {/* Selected metadata information */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Document Type / Property</span>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{selectedCategory?.name} | {getHotelName(selectedHotelId)}</p>
          </div>
          <GoogleIcon name="cloud_upload" className="text-gold" size={24} />
        </div>

        {/* Pre-uploaded files log for this date */}
        {dateReports.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Already Uploaded For This Date:</h4>
            <div className="space-y-1.5">
              {dateReports.map(r => 
                r.files?.map((file: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-slate-950 rounded-lg text-xs text-slate-350">
                    <span className="truncate max-w-[200px]">{file.fileName}</span>
                    <span className="text-[10px] text-slate-500">{new Date(file.uploadedAt || r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Drag & Drop or Button options */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border border-slate-800 bg-slate-900 hover:bg-slate-850 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer gap-2"
            >
              <GoogleIcon name="photo_camera" size={32} className="text-gold" />
              <span className="text-xs font-bold">Camera</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border border-slate-800 bg-slate-900 hover:bg-slate-850 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer gap-2"
            >
              <GoogleIcon name="attachment" size={32} className="text-gold" />
              <span className="text-xs font-bold">Attach File</span>
            </button>
          </div>

          {/* Desktop Drag and Drop Bulk Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const files = e.dataTransfer.files;
              if (files) {
                const newFiles: any[] = [];
                Array.from(files).forEach(file => {
                  if (validateFile(file)) {
                    const preview = URL.createObjectURL(file);
                    newFiles.push({ file, preview, name: file.name });
                  }
                });
                setSelectedFiles(prev => [...prev, ...newFiles]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              isDragging ? 'border-gold bg-gold/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <GoogleIcon name="cloud_upload" size={36} className={isDragging ? 'text-gold' : 'text-slate-500'} />
            <p className="mt-2 text-xs font-bold text-slate-200">Drag & Drop Files Here (Bulk Upload Support)</p>
            <p className="text-[10px] text-slate-500 mt-1">or click here to select files in bulk from your device</p>
          </div>
        </div>

        {/* Invisible file element selectors */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={handleFileInput}
        />
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInput}
        />

        {/* Selected file preview zone */}
        {selectedFiles.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview Selected Files</h4>
            <div className="grid grid-cols-2 gap-3.5">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-850 bg-slate-955 aspect-video flex items-center justify-center">
                  {f.file.type.startsWith('image/') ? (
                    <img src={f.preview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center p-2 text-center w-full">
                      <GoogleIcon name="description" size={30} className="text-slate-450" />
                      <span className="text-[10px] text-slate-400 mt-1 truncate w-full px-2">{f.name}</span>
                    </div>
                  )}
                  
                  {/* Remove hover button overlay */}
                  <button
                    onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-650 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <GoogleIcon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Note text field */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Write optional notes about this document..."
                rows={2}
                className="w-full bg-slate-955 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold placeholder-slate-650"
              />
            </div>

            {/* Progress bar info */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-955 rounded-full overflow-hidden">
                  <div className="h-full bg-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Upload execute button */}
            <button
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="w-full py-3 bg-gold hover:bg-gold-light disabled:opacity-50 text-slate-955 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <GoogleIcon name="sync" size={16} className="animate-spin" /> Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <GoogleIcon name="cloud_upload" size={16} /> Upload Now
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= RENDER VIEW FILES DATE SCREEN =================
  if (viewState === 'view-date') {
    const formattedDisplayDate = new Date(selectedFolderDate).toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });

    return (
      <div className="mt-6 space-y-6">
        {/* Navigation and header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setViewState('detail')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <GoogleIcon name="arrow_back" size={16} /> Back to Folders
          </button>
          
          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
            View Files - {formattedDisplayDate}
          </span>
        </div>

        {/* Selected metadata details info */}
        <div className="bg-slate-900 border border-slate-855 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Document Type / Property</span>
            <p className="text-xs font-bold text-slate-200 mt-0.5">{selectedCategory?.name} | {getHotelName(selectedHotelId)}</p>
          </div>
          <GoogleIcon name="folder_open" className="text-gold" size={24} />
        </div>

        {/* Files Grid View */}
        <div className="space-y-4">
          {loadingFolder ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Loading documents details...</p>
            </div>
          ) : folderReports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
              <GoogleIcon name="find_in_page" size={48} className="text-slate-600 opacity-40" />
              <div>
                <h4 className="text-sm font-bold text-slate-300">No Files Uploaded</h4>
                <p className="text-xs text-slate-500 mt-1">There are no operational reports stored for this date.</p>
              </div>
            </div>
          ) : (
            folderReports.map(report => (
              <div key={report._id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
                {/* Meta details header card */}
                <div className="p-4 border-b border-slate-800 bg-slate-955/20 flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">By: {report.employeeName}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-955 px-2 py-0.5 rounded border border-slate-850">{report.department}</span>
                      
                      {report.deleteStatus === 'PENDING_DELETE' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                          <GoogleIcon name="warning" size={10} /> Delete Requested
                        </span>
                      )}
                    </div>
                    {report.remarks && (
                      <p className="text-xs text-slate-450 mt-2"><span className="font-semibold text-slate-400">Note:</span> {report.remarks}</p>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Delete triggers */}
                    {report.deleteStatus === 'ACTIVE' && (
                      <button
                        onClick={() => setRequestingDeleteId(report._id)}
                        className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center gap-1 transition-all text-[10px] font-bold cursor-pointer border border-red-500/20"
                        title="Request Deletion"
                      >
                        <GoogleIcon name="delete" size={12} /> Request Delete
                      </button>
                    )}

                    {/* Admin Delete Request action approvals */}
                    {report.deleteStatus === 'PENDING_DELETE' && (user?.role === 'ROOT_ADMIN' || user?.department === 'Central Team') && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApproveDelete(report._id)}
                          disabled={processingId === report._id}
                          className="px-2.5 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white flex items-center transition-colors text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectDelete(report._id)}
                          disabled={processingId === report._id}
                          className="px-2.5 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-655 flex items-center transition-colors text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Permanent Hard delete */}
                    {user?.role === 'ROOT_ADMIN' && (
                      <button
                        onClick={() => handlePermanentDelete(report._id)}
                        disabled={processingId === report._id}
                        className="w-7 h-7 rounded bg-red-955/40 text-red-500 hover:bg-red-555 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                        title="Permanent Hard Delete"
                      >
                        <GoogleIcon name="delete_forever" size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit and deletion logs */}
                {report.deleteRequest?.reason && report.deleteStatus === 'PENDING_DELETE' && (
                  <div className="px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20 text-[11px] text-orange-200 flex items-start gap-1.5">
                    <GoogleIcon name="info" size={14} className="text-orange-400 mt-0.5" />
                    <div>
                      <span className="font-bold">Delete Reason: </span>
                      {report.deleteRequest.reason}
                    </div>
                  </div>
                )}

                {/* Files List mapping */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {report.files.map((file: any, idx: number) => (
                    <FileCard
                      key={idx}
                      reportId={report._id}
                      file={file}
                      user={user}
                      setLightboxImage={setLightboxImage}
                      handleShareFile={handleShareFile}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Reason Prompt popup overlay */}
        {requestingDeleteId && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-md flex items-center gap-2">
                <GoogleIcon name="warning" className="text-orange-400" size={20} /> Request Deletion
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Please provide a clear reason for requesting deletion of this document. This request will be sent to the Central Admin team for review.
              </p>
              <textarea
                className="w-full bg-slate-955 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold placeholder-slate-655"
                rows={3}
                placeholder="Wrong document, upload date error..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => { setRequestingDeleteId(null); setDeleteReason(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestDelete}
                  disabled={!deleteReason || processingId === requestingDeleteId}
                  className="px-5 py-2 bg-gold hover:bg-gold-light text-slate-955 font-bold text-xs rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {processingId === requestingDeleteId ? 'Sending...' : 'Request Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox full image popup overlay */}
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] w-auto h-auto flex flex-col items-center">
              <button className="absolute top-[-35px] right-0 text-white text-xs bg-slate-855 hover:bg-slate-750 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-700">✕ Close</button>
              <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[80vh] rounded shadow-2xl object-contain border border-gold/15" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
