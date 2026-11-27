/**
 * KIKIS Retail POS Sound System
 * Menggunakan Web Audio API sintetis — 100% offline, zero latency, tidak membutuhkan aset file audio eksternal.
 */

class SoundSystem {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  /**
   * Bunyi beep pemindai barcode khas kasir ritel (1850Hz, durasi 90ms)
   */
  playScanBeep() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1850, now)

      gain.gain.setValueAtTime(0.4, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.09)
    } catch {
      // AudioContext mungkin menunggu user interaction pertama
    }
  }

  /**
   * Bunyi sukses / item berhasil ditambahkan ke keranjang (chime ceria dua nada)
   */
  playSuccess() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Nada 1 (C6: 1046.5Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(1046.5, now)
      gain1.gain.setValueAtTime(0.25, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.08)

      // Nada 2 (G6: 1568Hz)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1567.98, now + 0.07)
      gain2.gain.setValueAtTime(0.3, now + 0.07)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.07)
      osc2.stop(now + 0.18)
    } catch {
      /* ignore */
    }
  }

  /**
   * Bunyi peringatan / stok habis / barcode tidak ditemukan (buzz rendah)
   */
  playError() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now) // A3 (220Hz)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.18)
    } catch {
      /* ignore */
    }
  }
}

export const sound = new SoundSystem()
