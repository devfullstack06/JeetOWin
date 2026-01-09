export async function login({ email, password }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  
    const data = await res.json().catch(() => ({}));
  
    if (!res.ok) {
      const msg = data?.error || data?.message || "Login failed";
      throw new Error(msg);
    }
  
    return data; // could include token/user depending on your backend
  }
  