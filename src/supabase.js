import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = "https://qricyrlxflhfrnyqmvqp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaWN5cmx4ZmxoZnJueXFtdnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjYzMjgsImV4cCI6MjA4OTg0MjMyOH0.hPLT6FzeBpC4GpAgsiulNgD8DQegHtzcus-xrJi5Ie8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isConfigured() {
  return !SUPABASE_URL.includes("PASTE_");
}

// ─── Records ──────────────────────────────────────────────────
function mergeRow(row) {
  return { ...(row.data||{}), id:row.id, date:row.date, service:row.service, pastor:row.pastor, notes:row.notes, total:row.total, created_at:row.created_at };
}

export async function loadRecords() {
  const { data, error } = await supabase.from("records").select("*").order("date", { ascending:false });
  if (error) throw error;
  return (data||[]).map(mergeRow);
}

export async function addRecord(record) {
  const { id:_, ...rest } = record;
  const { data, error } = await supabase.from("records").insert({ date:rest.date, service:rest.service||"Morning Service", pastor:rest.pastor||"", notes:rest.notes||"", total:rest.total||0, data:rest }).select().single();
  if (error) throw error;
  return mergeRow(data);
}

export async function deleteRecord(id) {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeRecords(cb) {
  loadRecords().then(cb).catch(console.error);
  const ch = supabase.channel("records").on("postgres_changes", { event:"*", schema:"public", table:"records" }, () => loadRecords().then(cb).catch(console.error)).subscribe();
  return () => supabase.removeChannel(ch);
}

// ─── Settings ─────────────────────────────────────────────────
export async function loadSettings() {
  const { data, error } = await supabase.from("settings").select("data").eq("id",1).single();
  if (error) throw error;
  return data?.data || null;
}

export async function saveSettings(settings) {
  const { error } = await supabase.from("settings").upsert({ id:1, data:settings, updated_at:new Date().toISOString() });
  if (error) throw error;
}

export function subscribeSettings(cb) {
  loadSettings().then(s => s && cb(s)).catch(console.error);
  const ch = supabase.channel("settings").on("postgres_changes", { event:"*", schema:"public", table:"settings" }, () => loadSettings().then(s => s && cb(s)).catch(console.error)).subscribe();
  return () => supabase.removeChannel(ch);
}

// ─── Users ────────────────────────────────────────────────────
export async function loadUsers() {
  const { data, error } = await supabase.from("users").select("id,username,name,role,email,active,created_at,last_login").order("created_at");
  if (error) throw error;
  return data || [];
}

export async function loginUser(username, password) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .eq("password", password)
    .eq("active", true)
    .single();
  if (error || !data) return null;
  // Update last_login
  await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", data.id);
  const { password: _, ...safeUser } = data;
  return safeUser;
}

export async function createUser(user) {
  const { data, error } = await supabase.from("users").insert({
    username: user.username.trim().toLowerCase(),
    password: user.password,
    name:     user.name,
    role:     user.role,
    email:    user.email || "",
    active:   true,
  }).select("id,username,name,role,email,active,created_at").single();
  if (error) throw error;
  return data;
}

export async function updateUser(id, updates) {
  const payload = { ...updates };
  if (payload.username) payload.username = payload.username.trim().toLowerCase();
  if (!payload.password) delete payload.password; // don't clear password if not changing
  const { error } = await supabase.from("users").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteUser(id) {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}

// ─── Backup ───────────────────────────────────────────────────
export async function downloadBackup() {
  const [records, settings] = await Promise.all([loadRecords(), loadSettings()]);
  const blob = new Blob([JSON.stringify({ records, settings }, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `church-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}
