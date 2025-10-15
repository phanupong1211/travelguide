Travel Guide (Next.js + Tailwind + PWA + Supabase)

Features
- 1:1 UI with the original Inspiration_UXUI.html (same Tailwind classes)
- Tabs: Checklist, Expenses, Itinerary
- Import/Export JSON (client-side download/upload)
- Currency conversion (USD/JPY -> THB) with editable rates
- Bill photo upload + preview; edit amount dialog
- Itinerary planner with time planning, travel-time hint, and add-to-expenses
- PWA: manifest + service worker, offline caching
- Local persistence via IndexedDB (fallback to localStorage)
- Optional cloud sync via Supabase (graceful no-op when not configured)

Getting started
1) Install deps
   npm install

2) Run dev server
   npm run dev

3) Build & run production
   npm run build
   npm start

PWA
- The app registers /sw.js automatically. On mobile/desktop you can install it from the browser (Add to Home Screen/Install site).

Supabase Cloud Sync (optional)
1) Create a Supabase project and open SQL editor.
2) Run ONE of the supplied SQL scripts:
   - `supabase/setup.sql` → เก็บข้อมูลทั้งแอปไว้ในคอลัมน์ JSON เดียว (วิธีที่แอปใช้ตอนนี้)
   - `supabase/schema_entities.sql` → สร้างตารางแบบ normalized แยก Trips/Checklist/Expenses/Itinerary (สำหรับงานรายงาน/ต่อยอด)
   - ถ้าต้องการแยกแชร์ค่าใช้จ่ายรายคน: รัน migration เพิ่มเติม `supabase/migrations/20251015_expenses_split.sql` เพื่อเพิ่มคอลัมน์ `paid_by text` และ `participants text[]` ในตาราง `expenses`
   - ถ้าต้องการ sync รายชื่อสมาชิกข้ามอุปกรณ์: รัน `supabase/migrations/20251015_trip_members.sql` เพื่อสร้างตาราง `trip_members`
3) Copy `.env.example` to `.env.local` and fill in values:
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
   - JSON mode: `NEXT_PUBLIC_SUPABASE_TABLE` (default `travel_data`), `NEXT_PUBLIC_SUPABASE_RECORD_ID` (default `1`)
   - เลือกโหมดข้อมูล: `NEXT_PUBLIC_DATA_MODE=entities` (หรือ `json`)
   - ถ้าใช้ entities mode: `NEXT_PUBLIC_TRIP_ID=1` (รหัสทริปที่จะโหลด)
 4) Start the app —
   - JSON mode: จะ sync ทั้ง payload เป็น JSON เดียว
   - Entities mode: แอปจะอ่าน/เขียนตารางจริงด้วย Supabase (ยังเก็บสำรองลง IndexedDB/localStorage เหมือนเดิม) รวมถึงรายชื่อสมาชิกใน `trip_members`

Notes
- If you need exact pixel parity with the HTML, all Tailwind class names were kept the same. Minor differences may stem from React-driven state vs. inline scripts.
- You can move or restyle buttons, but logic and storage are decoupled in components.
