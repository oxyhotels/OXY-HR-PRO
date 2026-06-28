'use client';
import React, { useState, useRef } from 'react';
import GoogleIcon from '../GoogleIcon';

interface ReportUploaderModalProps {
  category: string;
  onClose: () => void;
  onSubmit: (payload: { category: string; reportDate: string; files: any[]; remarks: string }) => Promise<void>;
}

export default function ReportUploaderModal({ category, onClose, onSubmit }: ReportUploaderModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; name: string }[]>([]);
  const [remarks, setRemarks] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
  
  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: any[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`⚠ File "${file.name}" is too large. Maximum size allowed is 10MB.`);
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert(`⚠ Unsupported file format for "${file.name}". Please upload JPG, PNG, WEBP, or PDF.`);
        return;
      }
      
      // Create preview
      const preview = URL.createObjectURL(file);
      newFiles.push({ file, preview, name: file.name });
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert("Please upload a document.");
      return;
    }
    if (!reportDate) {
      alert("Please select Report Date.");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10); // Start progress

    try {
      const processedFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i];
        const base64 = await convertToBase64(f.file);
        processedFiles.push({ fileUrl: base64, fileName: f.name });
        setUploadProgress(10 + Math.floor(((i + 1) / selectedFiles.length) * 40)); // Progress up to 50% during conversion
      }

      await onSubmit({ category, reportDate, files: processedFiles, remarks });
      
      setUploadProgress(100);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Upload failed', err);
      // The parent component handles the error alert with meaningful message
    } finally {
      setIsUploading(false);
    }
  };

  const formatCategoryName = (cat: string) => {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gold/20 flex items-center justify-center text-gold">
              <GoogleIcon name="cloud_upload" size={18} />
            </div>
            <h3 className="font-bold text-white text-sm">Upload to {formatCategoryName(category)}</h3>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-slate-400 hover:text-white transition-colors">
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {/* Report Date */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Report Date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold"
            />
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              isDragging ? 'border-gold bg-gold/5' : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <GoogleIcon name="backup" size={32} className={isDragging ? 'text-gold' : 'text-slate-500'} />
            <p className="mt-3 text-sm font-semibold text-white">Drag & drop files here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse from your device</p>
            <p className="text-[10px] text-slate-500 mt-3">Supports JPG, PNG, WEBP, PDF</p>
            
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileInput}
            />
          </div>

          <div className="mt-3 flex justify-center">
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <GoogleIcon name="photo_camera" size={16} />
              Take Photo with Camera
            </button>
            <input
              type="file"
              accept="image/*"
              capture="environment" // Mobile camera support
              className="hidden"
              ref={cameraInputRef}
              onChange={handleFileInput}
            />
          </div>

          {/* Previews */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Selected Files ({selectedFiles.length})</h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800 aspect-video flex items-center justify-center">
                    {f.file.type.startsWith('image/') ? (
                      <img src={f.preview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center p-2">
                        <GoogleIcon name="picture_as_pdf" size={32} className="text-red-400" />
                        <span className="text-[10px] text-slate-300 mt-1 truncate w-full text-center px-2">{f.name}</span>
                      </div>
                    )}
                    
                    {/* Delete overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => removeFile(i)}
                        className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <GoogleIcon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about these documents..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold"
              rows={3}
            />
          </div>

        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0 || isUploading}
            className="px-6 py-2 bg-gold hover:bg-gold-light text-slate-900 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <GoogleIcon name="sync" size={16} className="animate-spin" />
                Uploading {uploadProgress}%
              </>
            ) : (
              <>
                <GoogleIcon name="upload" size={16} />
                Upload {selectedFiles.length > 0 ? selectedFiles.length : ''} Files
              </>
            )}
          </button>
        </div>
        
        {/* Progress Bar */}
        {isUploading && (
          <div className="h-1 bg-slate-800 w-full absolute bottom-0 left-0">
            <div 
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
