-- 訂單來源歸因欄位
-- 用途：下單時記住客人最初從哪個渠道進入網站（首跳落地頁、外部引薦、UTM、廣告點擊 ID），
--       後台訂單詳情可直接查看每筆訂單的獲客來源。
-- 執行方式：Supabase Dashboard → SQL Editor → New query → 貼上本檔 → Run

-- 1. 渠道歸類（系統依來源自動判斷，如 Google 自然搜尋 / Facebook 廣告 / 直接訪問 等）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS traffic_source TEXT;

-- 2. UTM 活動參數
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- 3. 外部引薦頁與首跳落地頁
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS landing_page TEXT;

-- 4. 廣告點擊 ID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbclid TEXT;
