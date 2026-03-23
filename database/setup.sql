-- ═══════════════════════════════════════════════════════════════
-- Church Attendance System v5 — Supabase Setup (with RBAC)
-- ═══════════════════════════════════════════════════════════════
-- Paste this into Supabase SQL Editor → Run

-- ── Attendance Records ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date       DATE        NOT NULL,
  service    TEXT        NOT NULL DEFAULT 'Morning Service',
  pastor     TEXT        DEFAULT '',
  notes      TEXT        DEFAULT '',
  total      INTEGER     DEFAULT 0,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC);

-- ── Settings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id         INTEGER     PRIMARY KEY DEFAULT 1,
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (RBAC) ──────────────────────────────────────────────
-- Roles: superadmin | admin | pastor | dataentry | viewer
CREATE TABLE IF NOT EXISTS users (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username   TEXT        NOT NULL UNIQUE,
  password   TEXT        NOT NULL,
  name       TEXT        NOT NULL DEFAULT '',
  role       TEXT        NOT NULL DEFAULT 'viewer',
  email      TEXT        DEFAULT '',
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ── Default super admin account ───────────────────────────────
-- Username: admin  |  Password: admin123
-- CHANGE THIS PASSWORD immediately after first login!
INSERT INTO users (username, password, name, role) VALUES
  ('admin', 'admin123', 'System Administrator', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- ── Default settings ──────────────────────────────────────────
INSERT INTO settings (id, data) VALUES (1, '{
  "churchName": "Grace Community Church",
  "accentColor": "#00FF6A",
  "password": "",
  "bg": "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1600&q=80",
  "categories": [
    {"id":"men",         "label":"Men",          "icon":"👨", "color":"#00FF6A", "locked":true},
    {"id":"women",       "label":"Women",        "icon":"👩", "color":"#00FFCC", "locked":true},
    {"id":"children",    "label":"Children",     "icon":"👦", "color":"#FFB800", "locked":true},
    {"id":"teens",       "label":"Teens",        "icon":"🧑", "color":"#00BFFF", "locked":true},
    {"id":"firstTimers", "label":"First Timers", "icon":"🌟", "color":"#FF6600", "locked":true},
    {"id":"soulsWon",    "label":"Souls Won",    "icon":"✝",  "color":"#9945FF", "locked":true},
    {"id":"workers",     "label":"Workers",      "icon":"🛠",  "color":"#FF00AA", "locked":true},
    {"id":"online",      "label":"Online",       "icon":"💻", "color":"#44FF00", "locked":true}
  ],
  "pastors": [
    {"id":1, "name":"Pastor John Doe", "role":"Senior Pastor", "email":"pastor@church.org", "phone":""}
  ]
}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users    ENABLE ROW LEVEL SECURITY;

-- Allow anon key to access everything (app handles auth itself)
CREATE POLICY "public_access" ON records  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON users    FOR ALL USING (true) WITH CHECK (true);

-- ── Real-time ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE records;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

SELECT 'Setup complete! Login: admin / admin123' AS status;
