-- 會員積分系統數據庫結構
-- 執行時間：2026-09-12
-- 積分規則：消費 HK$1 = 1積分，100積分 = HK$1

-- 1. 在 profiles 表添加積分餘額字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. 創建積分變動記錄表
CREATE TABLE IF NOT EXISTS member_points_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL, -- earn: 獲得, spend: 使用, adjust: 調整, expire: 過期
    description TEXT,
    order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 創建索引
CREATE INDEX IF NOT EXISTS idx_member_points_log_member_id ON member_points_log(member_id);
CREATE INDEX IF NOT EXISTS idx_member_points_log_created_at ON member_points_log(created_at DESC);

-- 4. 啟用 RLS
ALTER TABLE member_points_log ENABLE ROW LEVEL SECURITY;

-- 5. 創建策略
CREATE POLICY "管理員可讀取積分記錄" ON member_points_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "管理員可插入積分記錄" ON member_points_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "管理員可更新積分記錄" ON member_points_log
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. 積分規則設置表
CREATE TABLE IF NOT EXISTS points_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    earn_rate INTEGER DEFAULT 1,          -- 消費1元得多少積分
    redeem_rate INTEGER DEFAULT 100,      -- 多少積分抵1元
    max_discount_percent INTEGER DEFAULT 30, -- 每單最多抵扣百分比
    points_expire_months INTEGER DEFAULT 12, -- 積分有效期（月）
    birthday_bonus INTEGER DEFAULT 500,   -- 生日獎勵積分
    signup_bonus INTEGER DEFAULT 500,     -- 註冊獎勵積分
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默認設置
INSERT INTO points_settings (id, earn_rate, redeem_rate, max_discount_percent, points_expire_months, birthday_bonus, signup_bonus)
VALUES (1, 1, 100, 30, 12, 500, 500)
ON CONFLICT (id) DO NOTHING;
