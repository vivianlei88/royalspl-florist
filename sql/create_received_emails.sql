-- 收件箱表
CREATE TABLE IF NOT EXISTS received_emails (
  id BIGSERIAL PRIMARY KEY,
  resend_id TEXT,
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  text_content TEXT,
  html_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_received_emails_created_at ON received_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_received_emails_is_read ON received_emails(is_read);
