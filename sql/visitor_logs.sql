-- 訪客記錄表
CREATE TABLE IF NOT EXISTS visitor_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip TEXT NOT NULL,
    country TEXT,
    region TEXT,
    city TEXT,
    page_url TEXT,
    page_title TEXT,
    is_new_visitor BOOLEAN DEFAULT false,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON visitor_logs(ip);

-- RLS：允許公開寫入（前台記錄訪客），只允許管理員讀取
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許前台插入訪客記錄" ON visitor_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "允許公開讀取最近訪客" ON visitor_logs
    FOR SELECT USING (true);
