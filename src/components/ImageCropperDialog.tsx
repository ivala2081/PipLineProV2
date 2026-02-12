import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@ds'
import { Minus, Plus, Scissors } from '@phosphor-icons/react'

interface ImageCropperDialogProps {
  open: boolean
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => void
  aspectRatio?: number
  title?: string
}

/**
 * Creates a cropped image from canvas crop area
 */
async function createCroppedImage(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to match the cropped area
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Convert canvas to blob with high quality
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.98
    )
  })
}

/**
 * Helper to create image element from source
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    // Don't set crossOrigin for blob URLs
    if (!url.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous')
    }
    image.src = url
  })
}

export function ImageCropperDialog({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  title,
}: ImageCropperDialogProps) {
  const { t } = useTranslation('components')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onCropAreaChange = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleCrop = async () => {
    if (!croppedAreaPixels) return

    setIsProcessing(true)
    try {
      const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels)
      onCropComplete(croppedBlob)
      onClose()
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 1))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {title || t('imageCropper.title', 'Crop Image')}
          </DialogTitle>
        </DialogHeader>

        {/* Cropper Area */}
        <div className="relative h-[400px] w-full bg-black/5">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            style={{
              containerStyle: {
                borderRadius: '0.5rem',
              },
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-black/60">
              {t('imageCropper.zoom', 'Zoom')}
            </span>
            <span className="text-xs text-black/40">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-black/10 transition-colors hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus size={16} weight="bold" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="flex size-8 items-center justify-center rounded-lg border border-black/10 transition-colors hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-xs text-black/40">
          {t(
            'imageCropper.hint',
            'Drag to reposition, use the slider or mouse wheel to zoom, then click Crop to apply.'
          )}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            {t('imageCropper.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="filled"
            onClick={handleCrop}
            disabled={isProcessing}
          >
            <Scissors size={16} weight="bold" />
            {isProcessing
              ? t('imageCropper.processing', 'Processing...')
              : t('imageCropper.crop', 'Crop Image')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
