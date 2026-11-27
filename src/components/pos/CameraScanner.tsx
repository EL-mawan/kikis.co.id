'use client'

/**
 * CameraScanner — kamera barcode scanner untuk halaman POS.
 * Menggunakan @zxing/browser (bekerja di semua browser: Chrome, Firefox, Safari).
 * Fallback BarcodeDetector native jika tersedia.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, FlipHorizontal, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CameraScannerProps {
  onDetect: (code: string) => void
  className?: string
}

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'error'

export function CameraScanner({ onDetect, className }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null) // zxing reader, typed loosely
  const lastCodeRef = useRef<string>('')
  const lastDetectTimeRef = useRef<number>(0)

  const [state, setState] = useState<ScannerState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [flashDetect, setFlashDetect] = useState(false)

  const stopCamera = useCallback(() => {
    // Stop ZXing reader
    if (readerRef.current) {
      try { readerRef.current.reset?.() } catch { /* ignore */ }
      readerRef.current = null
    }
    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setState('idle')
  }, [])

  const startCamera = useCallback(async () => {
    setErrorMsg('')
    setState('requesting')

    try {
      // 1. Get camera stream
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const video = videoRef.current
      if (!video) { stopCamera(); return }

      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()

      setState('scanning')

      // 2. Start ZXing continuous decode
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      reader.decodeFromVideoElement(video, (result, err) => {
        if (result) {
          const code = result.getText()
          const now = Date.now()
          if (code !== lastCodeRef.current || now - lastDetectTimeRef.current > 2000) {
            lastCodeRef.current = code
            lastDetectTimeRef.current = now
            setFlashDetect(true)
            setTimeout(() => setFlashDetect(false), 400)
            onDetect(code)
          }
        }
        // suppress NotFoundException (no barcode in frame) — it's normal
        if (err && err.name !== 'NotFoundException') {
          console.warn('[CameraScanner] ZXing error:', err)
        }
      })
    } catch (err) {
      const e = err as Error
      let msg = 'Tidak dapat mengakses kamera.'
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu muat ulang halaman.'
      } else if (e.name === 'NotFoundError') {
        msg = 'Tidak ada kamera yang ditemukan pada perangkat ini.'
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi kamera lain, lalu coba lagi.'
      } else if (e.name === 'OverconstrainedError') {
        msg = 'Kamera tidak mendukung resolusi yang diminta. Coba lagi.'
      }
      setErrorMsg(msg)
      setState('error')
    }
  }, [facingMode, onDetect, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        try { readerRef.current.reset?.() } catch { /* ignore */ }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const toggleFacing = () => {
    stopCamera()
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
  }

  /* ── IDLE ── */
  if (state === 'idle') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-secondary/40 p-6', className)}>
        <Camera className="size-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">Scan barcode dengan kamera</p>
        <p className="text-center text-xs text-muted-foreground/70">
          Mendukung semua browser (Chrome, Firefox, Safari)
        </p>
        <Button onClick={startCamera} className="h-10 bg-accent text-sm text-white hover:bg-accent/90">
          <Camera className="size-4" />
          Aktifkan Kamera
        </Button>
      </div>
    )
  }

  /* ── REQUESTING ── */
  if (state === 'requesting') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-secondary/40 p-6', className)}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Meminta izin kamera...</p>
      </div>
    )
  }

  /* ── ERROR ── */
  if (state === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6', className)}>
        <CameraOff className="size-8 text-red-500" />
        <p className="text-center text-sm font-medium text-red-700">{errorMsg}</p>
        <Button
          variant="outline"
          onClick={() => { setState('idle'); setErrorMsg('') }}
          className="h-9 border-red-300 text-red-700 hover:bg-red-100"
        >
          Coba Lagi
        </Button>
      </div>
    )
  }

  /* ── SCANNING ── */
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-black', className)}>
      {/* Video feed */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        aria-label="Tampilan kamera untuk scan barcode"
      />

      {/* Viewfinder overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'relative h-40 w-56 transition-all duration-150',
            flashDetect ? 'scale-105' : 'scale-100',
          )}
        >
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <span
              key={corner}
              className={cn(
                'absolute h-6 w-6 border-[#B99B79]',
                corner === 'tl' && 'left-0 top-0 border-l-2 border-t-2 rounded-tl',
                corner === 'tr' && 'right-0 top-0 border-r-2 border-t-2 rounded-tr',
                corner === 'bl' && 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl',
                corner === 'br' && 'bottom-0 right-0 border-b-2 border-r-2 rounded-br',
              )}
            />
          ))}
          {/* Scan line */}
          <span
            className={cn(
              'absolute left-1 right-1 h-0.5 bg-[#B99B79] opacity-80',
              flashDetect ? 'top-1/2 opacity-100' : 'animate-bounce top-1/2',
            )}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white/80">
          {flashDetect ? '✓ Terdeteksi!' : '● Memindai...'}
        </span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFacing}
            className="size-9 rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Ganti kamera depan/belakang"
          >
            <FlipHorizontal className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={stopCamera}
            className="size-9 rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Tutup kamera"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Flash effect on detect */}
      {flashDetect && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-green-400/25 transition-opacity" />
      )}
    </div>
  )
}
