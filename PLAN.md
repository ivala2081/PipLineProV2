# İzin Sistemi (Leave Management) Planı

## Özet
HR sayfasına yeni bir "İzinler" tabı ekleniyor. Çalışanlara tarih aralığında 3 tip izin verilebilecek:
- **Ücretli İzin** → maaş kesintisi YOK
- **Ücretsiz İzin** → maaş kesintisi VAR (gelmedi gibi hesaplanır)
- **Yıllık İzin** → maaş kesintisi YOK

## 1. Veritabanı — Migration 075

Yeni tablo: `hr_leaves`

```sql
id              UUID PK
employee_id     UUID FK → hr_employees
organization_id UUID FK → organizations
leave_type      TEXT CHECK ('paid' | 'unpaid' | 'annual')
start_date      DATE NOT NULL
end_date        DATE NOT NULL
notes           TEXT NULL
created_by      UUID NULL
created_at      TIMESTAMPTZ DEFAULT now()
```

- RLS: Org-scoped, `private.is_god()` OR admin/manager role (same as hr_attendance)
- CHECK: `end_date >= start_date`

## 2. TypeScript Tipleri — database.types.ts

- `HrLeaveType = 'paid' | 'unpaid' | 'annual'` type ekle
- `hr_leaves` Row/Insert/Update tipleri ekle

## 3. Query Hook — useHrQuery.ts

- `HrLeave` tipi
- `useHrLeavesQuery()` — tüm izinleri çek (org-scoped)
- `useHrMonthlyLeavesQuery(year, month)` — seçili aydaki izinleri çek
- `useHrLeaveMutations()` — create / delete izin
- Yardımcı fonksiyon: `countLeaveDaysInMonth(leave, year, month)` — bir izin kaydının seçili aydaki iş günü sayısını hesapla

## 4. Maaş Kesintisi Entegrasyonu — SalariesTab.tsx

Mevcut `attendanceDeductionByEmp` hesabına ek olarak:
- O aydaki `unpaid` izin günlerini hesapla
- Her ücretsiz izin günü = `salary_tl / fullDayDivisor` kesinti (absent ile aynı formül)
- `paid` ve `annual` izin → kesinti yok, hiçbir hesaba katılmaz

## 5. Yeni Tab — İzinler

### 5a. `src/pages/hr/LeavesTab.tsx`
- Çalışan seçici + izin tipi + başlangıç/bitiş tarihi + not
- Mevcut izinlerin listesi (tablo): Çalışan | Tip | Başlangıç | Bitiş | Gün Sayısı | Sil
- Filtre: ay/yıl period seçici

### 5b. `src/pages/hr/LeaveDialog.tsx`
- Dialog ile yeni izin ekleme formu
- Zod validasyon: employee_id required, leave_type required, start_date/end_date required, end >= start

### 5c. `src/pages/hr/index.tsx`
- Yeni "İzinler" TabsTrigger ekle (Devam Takibi'nden önce)
- LeavesTab lazy import

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/migrations/075_add_hr_leaves.sql` | Yeni tablo + RLS |
| `src/lib/database.types.ts` | HrLeaveType + hr_leaves types |
| `src/hooks/queries/useHrQuery.ts` | Leave query/mutation hooks |
| `src/pages/hr/LeavesTab.tsx` | YENİ — İzinler tab UI |
| `src/pages/hr/LeaveDialog.tsx` | YENİ — İzin ekleme dialog |
| `src/pages/hr/index.tsx` | Tab ekleme + import |
| `src/pages/hr/SalariesTab.tsx` | Ücretsiz izin kesintisi hesabı |
