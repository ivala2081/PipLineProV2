import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  DownloadSimple,
  Printer,
  ArrowClockwise,
  Info,
  WarningCircle,
  Copy,
} from '@phosphor-icons/react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Skeleton,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrSettingsQuery,
  useRegenerateQrTokenMutation,
} from '@/hooks/queries/useHrQuery'

interface QrCodeTabProps {
  lang: 'tr' | 'en'
}

export function QrCodeTab({ lang }: QrCodeTabProps) {
  const { data: settings, isLoading } = useHrSettingsQuery()
  const regenerateMutation = useRegenerateQrTokenMutation()
  const { toast } = useToast()

  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  const token = settings?.qr_token ?? ''
  const checkinUrl = token ? `${window.location.origin}/checkin/${token}` : ''

  useEffect(() => {
    if (!checkinUrl) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    void QRCode.toDataURL(checkinUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [checkinUrl])

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'ofis-mesai-qr.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePrint = () => {
    if (!dataUrl) return
    const win = window.open('', '_blank', 'width=640,height=800')
    if (!win) {
      toast({
        title: lang === 'tr' ? 'Yazdırma penceresi açılamadı' : 'Print window blocked',
        variant: 'error',
      })
      return
    }
    const title = lang === 'tr' ? 'Mesai Girişi QR Kodu' : 'Office Check-in QR'
    const subtitle =
      lang === 'tr' ? 'Telefonunuzla tarayın ve e-postanızla giriş yapın.' : 'Scan and sign in with your email.'
    win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { margin:0; padding:48px; font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        min-height:100vh; background:#fff; color:#111; }
      h1 { font-size:28px; margin:0 0 6px 0; }
      p.sub { font-size:14px; color:#555; margin:0 0 28px 0; }
      img { width:440px; height:440px; display:block; image-rendering:pixelated; }
      p.url { margin:24px 0 0; font-size:11px; color:#888; word-break:break-all; max-width:440px; text-align:center; }
      @media print {
        body { padding:24px; }
        p.url { color:#444; }
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p class="sub">${subtitle}</p>
    <img src="${dataUrl}" alt="${title}" />
    <p class="url">${checkinUrl}</p>
    <script>setTimeout(function(){window.print();}, 300);</script>
  </body>
</html>`)
    win.document.close()
  }

  const handleCopyUrl = async () => {
    if (!checkinUrl) return
    try {
      await navigator.clipboard.writeText(checkinUrl)
      toast({
        title: lang === 'tr' ? 'Bağlantı kopyalandı' : 'Link copied',
        variant: 'success',
      })
    } catch {
      toast({
        title: lang === 'tr' ? 'Kopyalanamadı' : 'Copy failed',
        variant: 'error',
      })
    }
  }

  const handleRegenerate = async () => {
    try {
      await regenerateMutation.mutateAsync()
      toast({
        title: lang === 'tr' ? 'Yeni QR kod oluşturuldu' : 'New QR code generated',
        variant: 'success',
      })
      setShowRegenConfirm(false)
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  }

  return (
    <div className="grid gap-lg md:grid-cols-[auto_1fr] md:items-start">
      {/* QR Code Display */}
      <div className="rounded-2xl border border-black/[0.07] bg-bg1 p-lg">
        {isLoading || !dataUrl ? (
          <Skeleton className="size-64 rounded-xl" />
        ) : (
          <img
            src={dataUrl}
            alt={lang === 'tr' ? 'Mesai QR Kodu' : 'Check-in QR Code'}
            className="size-64 rounded-xl"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>

      {/* Info + Actions */}
      <div className="space-y-md">
        <div>
          <h2 className="text-lg font-semibold text-black">
            {lang === 'tr' ? 'Mesai Girişi QR Kodu' : 'Office Check-in QR Code'}
          </h2>
          <p className="mt-xs text-sm text-black/60">
            {lang === 'tr'
              ? 'Bu QR kodu yazdırıp ofise asın. Çalışanlar telefonlarıyla tarayıp e-posta adresleriyle giriş yapabilir.'
              : 'Print and post this QR code in the office. Employees scan it with their phone and check in using their email.'}
          </p>
        </div>

        <div className="flex items-start gap-xs rounded-lg border border-blue/20 bg-blue/5 p-sm text-xs text-blue">
          <Info size={16} weight="fill" className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>
              {lang === 'tr'
                ? 'Giriş saati tarandığında otomatik kaydedilir.'
                : 'Check-in time is recorded automatically on scan.'}
            </p>
            <p>
              {lang === 'tr'
                ? 'Geç kalınmışsa "Geç" durumu otomatik işaretlenir.'
                : "If late, the 'Late' status is applied automatically."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-xs">
          <Button variant="filled" onClick={handlePrint} disabled={!dataUrl}>
            <Printer size={16} weight="bold" />
            {lang === 'tr' ? 'Yazdır' : 'Print'}
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={!dataUrl}>
            <DownloadSimple size={16} weight="bold" />
            {lang === 'tr' ? 'PNG İndir' : 'Download PNG'}
          </Button>
          <Button variant="outline" onClick={() => void handleCopyUrl()} disabled={!checkinUrl}>
            <Copy size={16} weight="bold" />
            {lang === 'tr' ? 'Bağlantıyı Kopyala' : 'Copy Link'}
          </Button>
        </div>

        <details className="rounded-lg border border-black/[0.07] bg-bg1 p-sm text-xs">
          <summary className="cursor-pointer font-medium text-black/60">
            {lang === 'tr' ? 'Gelişmiş' : 'Advanced'}
          </summary>
          <div className="mt-sm space-y-sm">
            <div>
              <p className="text-black/50">
                {lang === 'tr' ? 'Tarama bağlantısı:' : 'Scan URL:'}
              </p>
              <code className="mt-1 block break-all rounded bg-bg2 px-2 py-1 font-mono text-[11px] text-black/70">
                {checkinUrl || '—'}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red border-red/30 hover:bg-red/5"
              onClick={() => setShowRegenConfirm(true)}
            >
              <ArrowClockwise size={14} weight="bold" />
              {lang === 'tr' ? 'QR Kodunu Yenile' : 'Regenerate QR Code'}
            </Button>
            <p className="text-black/50">
              {lang === 'tr'
                ? 'Yenilerseniz eski QR kod çalışmayacak ve yeniden yazdırmanız gerekecek.'
                : 'Regenerating invalidates the old QR — you will need to reprint it.'}
            </p>
          </div>
        </details>
      </div>

      {/* Regenerate confirmation */}
      <Dialog open={showRegenConfirm} onOpenChange={(o) => !o && setShowRegenConfirm(false)}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-orange/10">
              <WarningCircle size={22} weight="fill" className="text-orange" />
            </div>
            <DialogTitle>
              {lang === 'tr' ? 'QR Kodunu Yenile' : 'Regenerate QR Code'}
            </DialogTitle>
            <DialogDescription>
              {lang === 'tr'
                ? 'Yeni bir QR kod oluşturulacak ve eski QR çalışmayacak. Yeni QR kodu yazdırıp asmayı unutmayın.'
                : 'A new QR code will be generated and the old one will stop working. Remember to print and post the new one.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRegenConfirm(false)}
              disabled={regenerateMutation.isPending}
            >
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={regenerateMutation.isPending}
              onClick={() => void handleRegenerate()}
            >
              {regenerateMutation.isPending
                ? lang === 'tr'
                  ? 'Yenileniyor...'
                  : 'Regenerating...'
                : lang === 'tr'
                  ? 'Evet, Yenile'
                  : 'Yes, Regenerate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
