import { useRef, useState, useEffect } from 'react'
import { Camera, Upload, Trash, ShieldStar, UserRectangle } from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@ds'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { ImageCropperDialog } from './ImageCropperDialog'

type UserRole = 'god' | 'admin' | 'manager' | 'operation' | 'ik'

const uploadIconSizes = { sm: 28, md: 40, lg: 52, xl: 64 }

function getRoleIcon(role?: UserRole | null) {
  return role === 'god' || role === 'admin' ? ShieldStar : UserRectangle
}

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl: string | null
  fallbackText?: string
  role?: UserRole | null
  onUploadSuccess: (url: string) => void
  onRemoveSuccess: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  bucket?: string
  shape?: 'circle' | 'square'
  skipProfileUpdate?: boolean
}

const sizeClasses = {
  sm: 'size-16',
  md: 'size-24',
  lg: 'size-32',
  xl: 'size-40',
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  role,
  onUploadSuccess,
  onRemoveSuccess,
  size = 'lg',
  editable = true,
  bucket = 'avatars',
  shape = 'circle',
  skipProfileUpdate = false,
}: AvatarUploadProps) {
  const Icon = getRoleIcon(role)
  const shapeClass = shape === 'square' ? 'rounded-xl' : 'rounded-3xl'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { toast } = useToast()

  // Cleanup object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop)
      }
    }
  }, [imageToCrop])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or GIF image',
        variant: 'error',
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 5MB',
        variant: 'error',
      })
      return
    }

    // Store the selected file and show cropper
    setSelectedFile(file)
    const imageUrl = URL.createObjectURL(file)
    setImageToCrop(imageUrl)
    setCropperOpen(true)
    setShowMenu(false)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!selectedFile) return

    setIsUploading(true)
    setCropperOpen(false)

    try {
      // Generate unique filename (use jpg for cropped images)
      const fileName = `${userId}/avatar-${Date.now()}.jpg`

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split(`/${bucket}/`)[1]
        if (oldPath) {
          // Ignore errors when deleting old avatar
          await supabase.storage.from(bucket).remove([oldPath])
        }
      }

      // Upload new avatar (using cropped blob)
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)

        // Check if bucket doesn't exist
        if (uploadError.message?.includes('Bucket not found')) {
          toast({
            title: 'Storage not configured',
            description: 'Please run migration 020_avatar_storage.sql in Supabase',
            variant: 'error',
          })
          return
        }

        throw uploadError
      }

      // Get public URL with cache busting
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName)

      // Add timestamp to prevent caching
      const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`

      // Update profile (skip for non-user entities like IB partners)
      if (!skipProfileUpdate) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userId)

        if (updateError) {
          console.error('Profile update error:', updateError)
          throw updateError
        }
      }

      toast({
        title: 'Success',
        description: 'Photo updated successfully',
        variant: 'success',
      })

      onUploadSuccess(publicUrlWithTimestamp)
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error)
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload avatar. Please try again.',
        variant: 'error',
      })
    } finally {
      setIsUploading(false)
      setSelectedFile(null)
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop)
        setImageToCrop(null)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCloseCropper = () => {
    setCropperOpen(false)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
    }
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!currentAvatarUrl) return

    setIsRemoving(true)
    setShowMenu(false)

    try {
      // Delete from storage
      const path = currentAvatarUrl.split(`/${bucket}/`)[1]
      if (path) {
        await supabase.storage.from(bucket).remove([path])
      }

      // Update profile (skip for non-user entities)
      if (!skipProfileUpdate) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', userId)

        if (error) throw error
      }

      toast({
        title: 'Success',
        description: 'Photo removed',
        variant: 'success',
      })

      onRemoveSuccess()
    } catch (error: unknown) {
      console.error('Error removing avatar:', error)
      toast({
        title: 'Remove failed',
        description:
          error instanceof Error ? error.message : 'Failed to remove avatar. Please try again.',
        variant: 'error',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar
        className={`${sizeClasses[size]} ${shapeClass} border-[6px] border-bg1 bg-white shadow-xl`}
      >
        {currentAvatarUrl && <AvatarImage src={currentAvatarUrl} className={shapeClass} />}
        <AvatarFallback className={`${shapeClass} bg-gradient-to-br from-black/5 to-black/10`}>
          <Icon size={uploadIconSizes[size]} weight="fill" className="text-black/35" />
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          {/* Upload/Edit Button */}
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            disabled={isUploading || isRemoving}
            className="absolute bottom-1 right-1 flex size-10 items-center justify-center rounded-full border-[3px] border-bg1 bg-white shadow-lg transition-all hover:scale-105 hover:bg-black/5 disabled:opacity-50"
          >
            {isUploading || isRemoving ? (
              <div className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-brand" />
            ) : (
              <Camera size={18} weight="bold" className="text-black/60" />
            )}
          </button>

          {/* Menu */}
          {showMenu && !isUploading && !isRemoving && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute bottom-12 right-0 z-50 w-48 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    fileInputRef.current?.click()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-black/[0.02]"
                >
                  <Upload size={16} weight="bold" className="text-black/50" />
                  <span className="font-medium text-black/90">
                    {currentAvatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </span>
                </button>
                {currentAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3 text-left text-sm transition-colors hover:bg-red/5"
                  >
                    <Trash size={16} weight="bold" className="text-red" />
                    <span className="font-medium text-red">Remove Photo</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Image Cropper Dialog */}
          {imageToCrop && (
            <ImageCropperDialog
              open={cropperOpen}
              imageSrc={imageToCrop}
              onClose={handleCloseCropper}
              onCropComplete={handleCropComplete}
              aspectRatio={1}
              title="Crop Profile Picture"
            />
          )}
        </>
      )}
    </div>
  )
}
