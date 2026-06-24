'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import GoogleIcon from './GoogleIcon';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inviteCode: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onSuccess }: QRScannerModalProps) {
  const router = useRouter();
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [demoInvites, setDemoInvites] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fetch active invites for developer override simulator usage
  useEffect(() => {
    if (isOpen) {
      const fetchDemoInvites = async () => {
        try {
          const res = await api.get('/hierarchy/invites/active');
          setDemoInvites(res.data.invites || []);
        } catch (err) {
          console.error('Failed to fetch active invites for simulator', err);
        }
      };
      fetchDemoInvites();
    }
  }, [isOpen]);

  // Manage camera streaming lifecycle
  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode]);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setScannerError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
      }
      setCameraActive(true);
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      setScannerError('Camera access denied or unavailable. Please upload a QR file instead.');
      setCameraActive(false);
    }
  };

  const scanLoop = async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          const { default: jsQR } = await import('jsqr');
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleDecodedQR(code.data);
            return; // stop scanning loop
          }
        } catch (e) {
          console.error('jsQR scanning error', e);
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const handleDecodedQR = (qrData: string) => {
    console.log('[QR Decoder] Decoded data:', qrData);
    let codeMatch = qrData.match(/join\/(INV-[A-Z0-9]+)/i);
    if (!codeMatch) {
      codeMatch = qrData.match(/(INV-[A-Z0-9]+)/i);
    }

    if (codeMatch && codeMatch[1]) {
      const inviteCode = codeMatch[1].toUpperCase();
      stopCamera();
      onClose();
      if (onSuccess) {
        onSuccess(inviteCode);
      } else {
        router.push(`/invite/${inviteCode}`);
      }
    } else {
      setScannerError('Invalid QR Code format. Please scan an OXY-HR PRO invitation QR code.');
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannerError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          try {
            const { default: jsQR } = await import('jsqr');
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code && code.data) {
              handleDecodedQR(code.data);
            } else {
              setScannerError('Could not find a valid QR code in this image. Make sure the QR is clear.');
            }
          } catch (e) {
            setScannerError('Failed to initialize QR decoder module.');
          }
        }
      };
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-955 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5 relative">
        {/* Close button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <GoogleIcon name="close" size={20} />
        </button>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <span className="p-1 rounded bg-gold/10 text-gold flex items-center">
              <GoogleIcon name="qr_code_scanner" size={18} />
            </span>
            QR Invite Scanner
          </h2>
          <p className="text-[10px] text-slate-400">Scan QR Code or upload image to submit pending join requests</p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800/80 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setScanMode('camera')}
            className={`py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              scanMode === 'camera'
                ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GoogleIcon name="videocam" size={16} />
            Camera Stream
          </button>
          <button
            type="button"
            onClick={() => setScanMode('upload')}
            className={`py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              scanMode === 'upload'
                ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GoogleIcon name="cloud_upload" size={16} />
            Upload File
          </button>
        </div>

        {/* Scanner Container */}
        <div className="relative aspect-square md:aspect-[4/3] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center animate-fade-in">
          {scanMode === 'camera' ? (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none border-2 border-gold/20 m-6 flex flex-col justify-between items-center rounded-lg">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse shadow-[0_0_10px_#d4af37]" />
                  <div className="w-8 h-8 border-t-2 border-l-2 border-gold absolute top-0 left-0 rounded-tl" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-gold absolute top-0 right-0 rounded-tr" />
                  <div className="w-8 h-8 border-b-2 border-l-2 border-gold absolute bottom-0 left-0 rounded-bl" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-gold absolute bottom-0 right-0 rounded-br" />
                </div>
              )}
              {!cameraActive && !scannerError && (
                <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                  <div className="w-8 h-8 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                  <span>Activating Camera Stream...</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 w-full h-full text-center relative">
              <label className="border-2 border-dashed border-slate-800 hover:border-gold/30 rounded-xl w-full h-full flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer group transition-colors">
                <span className="p-3 bg-slate-950 rounded-full text-slate-400 group-hover:text-gold transition-colors">
                  <GoogleIcon name="cloud_upload" size={28} />
                </span>
                <div className="space-y-0.5 text-xs text-slate-300 font-medium">
                  <p className="font-semibold text-slate-200">Click to Upload QR Image</p>
                  <p className="text-[10px] text-slate-500">Supports PNG, JPG, JPEG files</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} />
              </label>
            </div>
          )}
        </div>

        {/* Error alerts */}
        {scannerError && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-[10px] text-red-400 flex items-start gap-2">
            <GoogleIcon name="error_outline" size={16} className="shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{scannerError}</span>
          </div>
        )}

        {/* Invitation link simulator */}
        {demoInvites.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Simulator Override (For Verification)
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleDecodedQR(e.target.value);
                }
              }}
              defaultValue=""
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-semibold focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="" disabled>
                -- Select invite to simulate scanner --
              </option>
              {demoInvites.map((inv: any) => (
                <option key={inv._id} value={inv.inviteCode}>
                  [{inv.inviteCode}] {inv.departmentId?.name || 'Department'} (Manager:{' '}
                  {inv.managerId?.firstName} {inv.managerId?.lastName})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
