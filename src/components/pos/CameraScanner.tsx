'use client'

/**
 * CameraScanner — kamera barcode scanner universal untuk POS.
 * Menggunakan @zxing/browser & @zxing/library dengan multi-format decoder (EAN-13, Code 128, QR, dll).
 * Kompatibel dengan semua browser modern (Chrome, Safari/iOS, Firefox, Edge, Android).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, FlipHorizontal, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { sound } from '@/lib/sound'

interface CameraScannerProps {
  onDetect: (code: string) => void
  onClose?: () => void
  className?: string
  autoStart?: boolean
}

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'error'

export function CameraScanner({
  onDetect,
  onClose,
  className,
  autoStart = true,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastCodeRef = useRef<string>('')
  const lastDetectTimeRef = useRef<number>(0)
  const isStartingRef = useRef<boolean>(false)

  const [state, setState] = useState<ScannerState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [flashDetect, setFlashDetect] = useState(false)
  const [detectedCode, setDetectedCode] = useState<string>('')

  // Inisialisasi ZXing reader sekali
  useEffect(() => {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    readerRef.current = new BrowserMultiFormatReader(hints)

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
    }
  }, [])

  // Fungsi stop kamera
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop()
      } catch {
        /* ignore */
      }
      controlsRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setState('idle')
  }, [])

  // Fungsi start kamera
  const startCamera = useCallback(
    async (deviceIdOverride?: string, facingModeOverride?: 'environment' | 'user') => {
      if (isStartingRef.current) return
      isStartingRef.current = true

      setErrorMsg('')
      setState('requesting')

      try {
        // Stop session sebelumnya jika ada
        if (controlsRef.current) {
          try {
            controlsRef.current.stop()
          } catch {
            /* ignore */
          }
          controlsRef.current = null
        }

        // Cek dukungan secure context & mediaDevices
        if (typeof window !== 'undefined') {
          if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            throw new Error('SECURE_CONTEXT_REQUIRED')
          }
        }

        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('NO_MEDIA_DEVICES')
        }

        const targetFacing = facingModeOverride ?? facingMode
        const targetDeviceId = deviceIdOverride ?? selectedDeviceId

        // Bangun constraints
        const videoConstraints: MediaTrackConstraints = targetDeviceId
          ? { deviceId: { exact: targetDeviceId } }
          : {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }

        const constraints: MediaStreamConstraints = {
          video: videoConstraints,
          audio: false,
        }

        // Pastikan video element siap
        const video = videoRef.current
        if (!video) {
          throw new Error('VIDEO_ELEMENT_NOT_MOUNTED')
        }

        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')

        if (!readerRef.current) {
          const hints = new Map()
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.QR_CODE,
          ])
          readerRef.current = new BrowserMultiFormatReader(hints)
        }

        let controls: IScannerControls
        try {
          controls = await readerRef.current.decodeFromConstraints(
            constraints,
            video,
            (result) => {
              if (result) {
                const code = result.getText()
                const now = Date.now()
                if (code !== lastCodeRef.current || now - lastDetectTimeRef.current > 2000) {
                  lastCodeRef.current = code
                  lastDetectTimeRef.current = now
                  setDetectedCode(code)
                  setFlashDetect(true)
                  setTimeout(() => setFlashDetect(false), 500)
                  sound.playScanBeep()
                  onDetect(code)
                }
              }
            }
          )
        } catch (constraintErr) {
          // Fallback jika constraint resolusi/facingMode gagal: coba dengan constraint sederhana { video: true }
          console.warn('[CameraScanner] Fallback ke { video: true }:', constraintErr)
          controls = await readerRef.current.decodeFromConstraints(
            { video: true, audio: false },
            video,
            (result) => {
              if (result) {
                const code = result.getText()
                const now = Date.now()
                if (code !== lastCodeRef.current || now - lastDetectTimeRef.current > 2000) {
                  lastCodeRef.current = code
                  lastDetectTimeRef.current = now
                  setDetectedCode(code)
                  setFlashDetect(true)
                  setTimeout(() => setFlashDetect(false), 500)
                  sound.playScanBeep()
                  onDetect(code)
                }
              }
            }
          )
        }

        controlsRef.current = controls
        setState('scanning')

        // Ambil daftar kamera yang tersedia setelah izin diberikan
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices()
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput')
          setDevices(videoInputs)
        } catch {
          /* ignore */
        }
      } catch (err) {
        const e = err as Error
        let msg = 'Tidak dapat mengakses kamera.'

        if (e.message === 'SECURE_CONTEXT_REQUIRED') {
          msg = 'Akses kamera membutuhkan HTTPS. Buka situs dengan https:// (atau localhost saat development).'
        } else if (e.message === 'NO_MEDIA_DEVICES') {
          msg = 'Browser ini tidak mendukung akses kamera atau izin dinonaktifkan di sistem operasi.'
        } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          msg = 'Izin kamera ditolak. Izinkan akses kamera melalui ikon gembok/kamera di samping URL browser, lalu klik Coba Lagi.'
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          msg = 'Tidak ada perangkat kamera yang terdeteksi pada komputer/ponsel ini.'
        } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
          msg = 'Kamera sedang digunakan aplikasi lain (Zoom, Teams, dll). Tutup aplikasi tersebut lalu coba lagi.'
        } else if (e.name === 'OverconstrainedError') {
          msg = 'Kamera tidak mendukung format yang diminta. Silakan coba lagi.'
        } else if (e.message) {
          msg = `Gagal membuka kamera: ${e.message}`
        }

        setErrorMsg(msg)
        setState('error')
      } finally {
        isStartingRef.current = false
      }
    },
    [facingMode, onDetect, selectedDeviceId]
  )

  // Auto start on mount jika diizinkan
  useEffect(() => {
    let mounted = true
    if (autoStart) {
      // beri jeda 1 tick agar videoRef benar-benar siap di DOM
      const timer = setTimeout(() => {
        if (mounted) {
          startCamera()
        }
      }, 50)
      return () => {
        mounted = false
        clearTimeout(timer)
        stopCamera()
      }
    }
    return () => {
      mounted = false
      stopCamera()
    }
  }, [autoStart, startCamera, stopCamera])

  // Ganti kamera depan / belakang
  const toggleFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacing)
    setSelectedDeviceId('')
    startCamera(undefined, nextFacing)
  }

  // Ganti perangkat kamera dari dropdown jika ada > 1
  const switchDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    startCamera(deviceId, undefined)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-[#181818] shadow-inner',
        className
      )}
    >
      {/* Video element SELALU terpasang di DOM agar videoRef tidak pernah null */}
      <video
        ref={videoRef}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          state === 'scanning' ? 'opacity-100' : 'opacity-0'
        )}
        playsInline
        muted
        autoPlay
        aria-label="Tampilan kamera scanner barcode"
      />

      {/* STATE: IDLE */}
      {state === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary/80 p-6 text-center backdrop-blur-sm">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Camera className="size-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Pemindai Barcode Kamera</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Arahkan kamera ke barcode produk atau QR code
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={() => startCamera()}
              className="h-10 bg-accent px-5 text-sm text-white hover:bg-accent/90"
            >
              <Camera className="mr-2 size-4" />
              Aktifkan Kamera
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 text-sm"
              >
                Tutup
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STATE: REQUESTING */}
      {state === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white backdrop-blur-sm">
          <Loader2 className="size-9 animate-spin text-[#B99B79]" />
          <div>
            <p className="text-sm font-medium text-white">Menghubungkan Kamera...</p>
            <p className="mt-1 text-xs text-white/70">
              Klik &quot;Izinkan&quot; jika muncul pop-up izin browser
            </p>
          </div>
        </div>
      )}

      {/* STATE: ERROR */}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-50/95 p-6 text-center text-red-950 backdrop-blur-sm dark:bg-red-950/90 dark:text-red-100">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
            <CameraOff className="size-6" />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-semibold">Tidak Dapat Membuka Kamera</p>
            <p className="mt-1 text-xs leading-relaxed text-red-800 dark:text-red-200">
              {errorMsg}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => startCamera()}
              className="h-9 bg-red-600 text-xs text-white hover:bg-red-700"
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Coba Lagi
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 border-red-300 text-xs text-red-900 hover:bg-red-100 dark:border-red-800 dark:text-red-100"
              >
                Tutup
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STATE: SCANNING OVERLAYS */}
      {state === 'scanning' && (
        <>
          {/* Frame Viewfinder Target */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                'relative h-44 w-64 transition-all duration-200',
                flashDetect ? 'scale-105 border-green-400' : 'scale-100'
              )}
            >
              {/* 4 Sudut Viewfinder */}
              {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                <span
                  key={corner}
                  className={cn(
                    'absolute h-7 w-7 border-[#B99B79] transition-colors',
                    flashDetect && 'border-green-400',
                    corner === 'tl' && 'left-0 top-0 rounded-tl-lg border-l-4 border-t-4',
                    corner === 'tr' && 'right-0 top-0 rounded-tr-lg border-r-4 border-t-4',
                    corner === 'bl' && 'bottom-0 left-0 rounded-bl-lg border-b-4 border-l-4',
                    corner === 'br' && 'bottom-0 right-0 rounded-br-lg border-b-4 border-r-4'
                  )}
                />
              ))}

              {/* Garis laser pemindai */}
              <span
                className={cn(
                  'absolute left-2 right-2 h-0.5 rounded-full shadow-[0_0_8px_rgba(185,155,121,0.8)] transition-all',
                  flashDetect
                    ? 'top-1/2 bg-green-400 opacity-100 shadow-[0_0_12px_rgba(74,222,128,1)]'
                    : 'animate-pulse top-1/2 bg-[#B99B79] opacity-90'
                )}
              />

              <p className="absolute -bottom-7 left-0 right-0 text-center text-[11px] font-medium text-white/80 drop-shadow">
                Posisikan barcode di dalam kotak
              </p>
            </div>
          </div>

          {/* Flash feedback saat berhasil mendeteksi */}
          {flashDetect && (
            <div className="pointer-events-none absolute inset-0 bg-green-500/20 backdrop-blur-[1px] transition-opacity" />
          )}

          {/* Top Bar Status */}
          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-md transition-colors',
                flashDetect
                  ? 'bg-green-500 text-white'
                  : 'bg-black/60 text-white/90'
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  flashDetect ? 'animate-ping bg-white' : 'animate-pulse bg-emerald-400'
                )}
              />
              {flashDetect && detectedCode
                ? `✓ Terbaca: ${detectedCode}`
                : '● Kamera Aktif (Scanning...)'}
            </span>

            {/* Tombol Tutup Kamera */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                stopCamera()
                onClose?.()
              }}
              className="size-8 rounded-full bg-black/60 text-white shadow hover:bg-black/80"
              aria-label="Tutup kamera"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Bottom Bar Controls */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            {/* Pilihan Kamera jika > 1 */}
            {devices.length > 1 ? (
              <select
                aria-label="Pilih kamera"
                value={selectedDeviceId}
                onChange={(e) => switchDevice(e.target.value)}
                className="h-8 max-w-[180px] truncate rounded-lg bg-black/70 px-2.5 text-xs text-white backdrop-blur outline-none hover:bg-black/90"
              >
                {devices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId} className="bg-[#252525] text-white">
                    {dev.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-white/70">
                {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggleFacing}
                className="h-8 gap-1 rounded-lg bg-black/60 px-2.5 text-xs text-white hover:bg-black/80"
                aria-label="Ganti kamera depan atau belakang"
              >
                <FlipHorizontal className="size-3.5" />
                <span className="hidden sm:inline">Balik</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
