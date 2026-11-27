'use client'

/**
 * CameraScanner — kamera barcode scanner untuk halaman POS.
 * Menggunakan BarcodeDetector API (Chrome/Android) dengan fallback
 * ke polling scan via canvas.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, FlipHorizontal, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CameraScannerProps {
  onDetect: (code: string) => void
  className?: string
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<{ rawValue: string }[]>
    }
  }
}

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'error'

export function CameraScanner({ onDetect, className }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<InstanceType<NonNullable<Window['BarcodeDetector']>> | null>(null)
  const rafRef = useRef<number>(0)
  const lastCodeRef = useRef<string>('')
  const lastDetectTimeRef = useRef<number>(0)
  const scanFrameRef = useRef<() => void>(() => {})

  const [state, setState] = useState<ScannerState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false)
  const [flashDetect, setFlashDetect] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && Boolean(window.BarcodeDetector)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- check native support on mount
      setHasBarcodeDetector(true)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setState('idle')
  }, [])

  const scanFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => scanFrameRef.current())
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    if (detectorRef.current) {
      detectorRef.current
        .detect(video)
        .then((results) => {
          if (results.length > 0) {
            const code = results[0].rawValue
            const now = Date.now()
            if (code !== lastCodeRef.current || now - lastDetectTimeRef.current > 2000) {
              lastCodeRef.current = code
              lastDetectTimeRef.current = now
              setFlashDetect(true)
              setTimeout(() => setFlashDetect(false), 300)
              onDetect(code)
            }
          }
        })
        .catch(() => {})
    }

    rafRef.current = requestAnimationFrame(() => scanFrameRef.current())
  }, [onDetect])

  useEffect(() => {
    scanFrameRef.current = scanFrame
  }, [scanFrame])

  const startCamera = useCallback(async () => {
    setErrorMsg('')
    setState('requesting')
    try {
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      if (hasBarcodeDetector && window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({
          formats: [
            'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93',
            'qr_code', 'upc_a', 'upc_e', 'itf', 'data_matrix',
          ],
        })
      } else {
        detectorRef.current = null
      }

      setState('scanning')
      rafRef.current = requestAnimationFrame(() => scanFrameRef.current())
    } catch (err) {
      const e = err as Error
      let msg = 'Tidak dapat mengakses kamera.'
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Aktifkan izin kamera di browser.'
      } else if (e.name === 'NotFoundError') {
        msg = 'Tidak ada kamera yang ditemukan pada perangkat ini.'
      } else if (e.name === 'NotReadableError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain.'
      }
      setErrorMsg(msg)
      setState('error')
    }
  }, [facingMode, hasBarcodeDetector])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  const toggleCamera = () => {
    if (state === 'scanning') {
      stopCamera()
    }
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
  }

  if (state === 'idle') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-secondary/40 p-6', className)}>
        <Camera className="size-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">Scan barcode dengan kamera</p>
        {!hasBarcodeDetector && (
          <p className="text-center text-xs text-amber-600">
            Browser ini tidak mendukung BarcodeDetector. Gunakan Chrome terbaru untuk hasil terbaik.
          </p>
        )}
        <Button onClick={startCamera} className="h-10 bg-accent text-sm text-white hover:bg-accent/90">
          <Camera className="size-4" />
          Aktifkan Kamera
        </Button>
      </div>
    )
  }

  if (state === 'requesting') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-secondary/40 p-6', className)}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Meminta izin kamera...</p>
      </div>
    )
  }

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

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-black', className)}>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        aria-label="Tampilan kamera untuk scan barcode"
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden />

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
                corner === 'tl' && 'left-0 top-0 border-l-2 border-t-2',
                corner === 'tr' && 'right-0 top-0 border-r-2 border-t-2',
                corner === 'bl' && 'bottom-0 left-0 border-b-2 border-l-2',
                corner === 'br' && 'bottom-0 right-0 border-b-2 border-r-2',
              )}
            />
          ))}
          <span
            className={cn(
              'absolute left-1 right-1 h-0.5 bg-[#B99B79] opacity-80',
              flashDetect ? 'top-1/2 opacity-100' : 'animate-bounce top-1/2',
            )}
          />
        </div>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white/80">
          {hasBarcodeDetector ? '● Memindai...' : '● Ketik kode manual'}
        </span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleCamera}
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

      {flashDetect && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-green-400/20 transition-opacity" />
      )}
    </div>
  )
}
