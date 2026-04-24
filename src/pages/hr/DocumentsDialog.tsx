import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileArrowUp,
  FilePdf,
  Image,
  CheckCircle,
  Spinner,
  Trash,
  Eye,
  WarningCircle,
  FolderOpen,
} from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrEmployeeDocumentsQuery,
  useHrDocumentMutations,
  HR_DOCUMENT_TYPES,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'
import type { HrDocumentType } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Document Item                                                       */
/* ------------------------------------------------------------------ */

function DocumentItem({
  docType,
  labelTr,
  labelEn,
  employeeId,
  language,
}: {
  docType: HrDocumentType
  labelTr: string
  labelEn: string
  employeeId: string
  language: string
}) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: docs = [] } = useHrEmployeeDocumentsQuery(employeeId)
  const { uploadDocument, deleteDocument } = useHrDocumentMutations(employeeId)

  const existingDoc = docs.find((d) => d.document_type === docType)
  const label = language === 'tr' ? labelTr : labelEn

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: language === 'tr' ? 'Dosya çok büyük (max 10MB)' : 'File too large (max 10MB)',
        variant: 'error',
      })
      return
    }
    try {
      await uploadDocument.mutateAsync({ file, documentType: docType })
      toast({
        title: language === 'tr' ? 'Belge yüklendi' : 'Document uploaded',
        variant: 'success',
      })
    } catch {
      toast({ title: language === 'tr' ? 'Yükleme başarısız' : 'Upload failed', variant: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!existingDoc) return
    try {
      await deleteDocument.mutateAsync({
        docId: existingDoc.id,
        storagePath: existingDoc.storage_path,
      })
      toast({ title: language === 'tr' ? 'Belge silindi' : 'Document deleted', variant: 'success' })
    } catch {
      toast({ title: language === 'tr' ? 'Silme başarısız' : 'Delete failed', variant: 'error' })
    }
  }

  const isUploading = uploadDocument.isPending
  const isDeleting = deleteDocument.isPending
  const isPdf = existingDoc?.file_name?.toLowerCase().endsWith('.pdf')

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        existingDoc
          ? 'border-green/30 bg-green/[0.04]'
          : 'border-black/[0.08] bg-bg2 hover:border-black/20'
      }`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
          existingDoc ? 'bg-green/15' : 'bg-black/[0.06]'
        }`}
      >
        {isUploading || isDeleting ? (
          <Spinner size={14} className="animate-spin text-black/40" />
        ) : existingDoc ? (
          isPdf ? (
            <FilePdf size={14} className="text-green" />
          ) : (
            <Image size={14} className="text-green" />
          )
        ) : (
          <FileArrowUp size={14} className="text-black/30" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-black/80">{label}</p>
        {existingDoc ? (
          <p className="truncate text-[10px] text-black/40">{existingDoc.file_name}</p>
        ) : (
          <p className="text-[10px] text-black/35">PDF, JPG, PNG — max 10MB</p>
        )}
      </div>

      {existingDoc && !isDeleting && !isUploading && (
        <CheckCircle size={14} weight="fill" className="shrink-0 text-green" />
      )}

      <div className="flex shrink-0 items-center gap-1">
        {existingDoc ? (
          <>
            <a href={existingDoc.file_url} target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                className="text-black/40 hover:text-black"
              >
                <Eye size={13} />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-red/50 hover:text-red"
            >
              <Trash size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="text-black/40 hover:text-black"
            >
              <FileArrowUp size={13} />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="h-6 px-2 text-[11px]"
          >
            {isUploading ? (
              <Spinner size={11} className="animate-spin" />
            ) : language === 'tr' ? (
              'Yükle'
            ) : (
              'Upload'
            )}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => void handleFileChange(e)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Documents Dialog                                                    */
/* ------------------------------------------------------------------ */

interface DocumentsDialogProps {
  open: boolean
  onClose: () => void
  employee: HrEmployee | null
}

export function DocumentsDialog({ open, onClose, employee }: DocumentsDialogProps) {
  const { i18n } = useTranslation('pages')
  const lang = i18n.language === 'tr' ? 'tr' : 'en'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FolderOpen size={20} className="text-brand" weight="duotone" />
            {lang === 'tr' ? 'Sigorta Belgeleri' : 'Insurance Documents'}
            {employee && (
              <span className="ml-1 text-sm font-normal text-black/50">— {employee.full_name}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            <span className="flex items-center gap-1.5">
              <WarningCircle size={13} weight="fill" className="text-orange" />
              {lang === 'tr'
                ? 'Belgeler gizlidir. PDF, JPG veya PNG, maksimum 10MB.'
                : 'Documents are confidential. PDF, JPG or PNG, max 10MB.'}
            </span>
          </DialogDescription>
        </DialogHeader>

        {employee ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {HR_DOCUMENT_TYPES.map(({ type, labelTr, labelEn }) => (
              <DocumentItem
                key={type}
                docType={type}
                labelTr={labelTr}
                labelEn={labelEn}
                employeeId={employee.id}
                language={lang}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-black/40">
            {lang === 'tr' ? 'Çalışan seçilmedi.' : 'No employee selected.'}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>
            {lang === 'tr' ? 'Kapat' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
