-- 客服會話表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    visitor_ip TEXT,
    visitor_country TEXT,
    visitor_region TEXT,
    current_page TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    admin_replied BOOLEAN DEFAULT false
);

-- 客服消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- visitor / ai / admin
    sender_name TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(is_read) WHERE is_read = false;

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許前台插入會話" ON chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "允許前台更新會話" ON chat_sessions FOR UPDATE USING (true);
CREATE POLICY "允許公開讀取會話" ON chat_sessions FOR SELECT USING (true);

CREATE POLICY "允許前台插入消息" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "允許公開讀取消息" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "允許管理員更新消息" ON chat_messages FOR UPDATE USING (true);
