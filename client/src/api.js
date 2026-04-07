const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({
    ok: false,
    error: "Unexpected server response.",
  }));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export const api = {
  getSession() {
    return request("/api/auth/session", {
      method: "GET",
    });
  },
  signup(body) {
    return request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  login(body) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  logout() {
    return request("/api/auth/logout", {
      method: "POST",
    });
  },
  getProfile() {
    return request("/api/profile", {
      method: "GET",
    });
  },
  updateProfileAvatar(body) {
    return request("/api/profile/avatar", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  searchFriends(query) {
    return request(`/api/friends/search?q=${encodeURIComponent(query)}`, {
      method: "GET",
    });
  },
  getFriends() {
    return request("/api/friends", {
      method: "GET",
    });
  },
  sendFriendRequest(receiverUserId) {
    return request("/api/friends/requests", {
      method: "POST",
      body: JSON.stringify({ receiverUserId }),
    });
  },
  respondToFriendRequest(requestId, decision) {
    return request(`/api/friends/requests/${requestId}/respond`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
  },
  getNotifications() {
    return request("/api/notifications", {
      method: "GET",
    });
  },
  markAllNotificationsRead() {
    return request("/api/notifications/read-all", {
      method: "PATCH",
    });
  },
  markNotificationRead(notificationId) {
    return request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },
  getLeaderboards({ scope = "global", timeframe = "season", region = "", country = "" } = {}) {
    const query = new URLSearchParams({
      scope,
      timeframe,
      ...(region ? { region } : {}),
      ...(country ? { country } : {}),
    });

    return request(`/api/leaderboards?${query.toString()}`, {
      method: "GET",
    });
  },
  getLiveMatches() {
    return request("/api/live-matches", {
      method: "GET",
    });
  },
};
