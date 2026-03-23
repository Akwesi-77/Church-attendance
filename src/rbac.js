// ═══════════════════════════════════════════════════════════════
// rbac.js — Role-Based Access Control
// ═══════════════════════════════════════════════════════════════

export const ROLES = {
  superadmin: {
    label: "Super Admin",
    color: "#FF4466",
    icon:  "⬡",
    description: "Full access — manages users, settings, all data",
    permissions: new Set(["*"]), // wildcard = everything
  },
  admin: {
    label: "Admin",
    color: "#FFB800",
    icon:  "◈",
    description: "Full data access — cannot manage users or system settings",
    permissions: new Set(["dashboard","entry","analytics","records","records.delete","reports","pastors","settings.general","settings.background","settings.categories"]),
  },
  pastor: {
    label: "Pastor",
    color: "#00FFCC",
    icon:  "✝",
    description: "View all reports and analytics — cannot delete records or change settings",
    permissions: new Set(["dashboard","analytics","records","reports","pastors"]),
  },
  dataentry: {
    label: "Data Entry",
    color: "#00FF6A",
    icon:  "✏",
    description: "Record attendance and view data — cannot delete or change settings",
    permissions: new Set(["dashboard","entry","records","reports"]),
  },
  viewer: {
    label: "Viewer",
    color: "#00BFFF",
    icon:  "◉",
    description: "Read-only access — dashboard, analytics and reports only",
    permissions: new Set(["dashboard","analytics","reports"]),
  },
};

/**
 * Check if a user has a specific permission.
 * superadmin passes everything via the "*" wildcard.
 */
export function can(user, permission) {
  if (!user) return false;
  const role = ROLES[user.role];
  if (!role) return false;
  if (role.permissions.has("*")) return true;
  return role.permissions.has(permission);
}

/**
 * All sidebar nav items with required permission key.
 * Items without a matching permission are hidden for that user.
 */
export const NAV = [
  { id:"dashboard", icon:"◈", label:"DASHBOARD",   perm:"dashboard"  },
  { id:"entry",     icon:"⊕", label:"RECORD",       perm:"entry"      },
  { id:"analytics", icon:"◉", label:"ANALYTICS",    perm:"analytics"  },
  { id:"records",   icon:"≡", label:"ALL RECORDS",  perm:"records"    },
  { id:"reports",   icon:"⊟", label:"REPORTS",      perm:"reports"    },
  { id:"pastors",   icon:"◎", label:"TEAM",          perm:"pastors"    },
  { id:"settings",  icon:"◌", label:"SETTINGS",     perm:"settings.general" },
  { id:"users",     icon:"⬡", label:"USER ACCOUNTS", perm:"users"     },
];

/** Settings tabs each role can see */
export const SETTINGS_TABS = [
  { id:"general",    label:"GENERAL",    perm:"settings.general"    },
  { id:"background", label:"BACKGROUND", perm:"settings.background" },
  { id:"categories", label:"CATEGORIES", perm:"settings.categories" },
  { id:"password",   label:"PASSWORD",   perm:"settings.general"    },
];
