const TOKEN_KEY = "feedpulse_admin_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── Token helpers ─────────────────────────────────────────
export const saveToken = (token: string) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
};

export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

export const isLoggedIn = (): boolean => {
  return !!getToken();
};

// ─── Auth header ──────────────────────────────────────────
export const authHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Login API call ───────────────────────────────────────
export const loginAdmin = async (
  email: string,
  password: string
): Promise<{ token: string }> => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data.data; // { token, expiresIn }
};

// ─── Verify token is still valid ─────────────────────────
export const verifyToken = async (): Promise<boolean> => {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
};