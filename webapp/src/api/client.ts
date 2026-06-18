const API_BASE = "/api";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const locale = localStorage.getItem("locale") || "en";
  const res = await fetch(`${API_BASE}${url}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": locale,
      ...options.headers,
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(res.status, err.message ?? err.error ?? "Request failed", err.error);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ user: { id: string; email: string; role: string } }>("/auth/register", {
        method: "POST",
        body: { email, password },
      }),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; role: string } }>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    refresh: () => request<{ ok: boolean }>("/auth/refresh", { method: "POST" }),
    me: () => request<{ user: { id: string; email: string; role: string } }>("/auth/me"),
  },

  specialties: {
    list: () => request<Array<{ id: string; slug: string; name: string; icon: string; exerciseCount: number }>>("/specialties"),
    get: (slug: string) => request<{ id: string; slug: string; name: string; icon: string; exercises: Array<{ id: string; title: string; difficulty: string }> }>(`/specialties/${slug}`),
  },

  exercises: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ data: unknown[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/exercises${qs}`);
    },
    get: (id: string) =>
      request<ExerciseDetail>(`/exercises/${id}`),
    attempts: (id: string) => request<Array<{ id: string; status: string; score: number; timeSpent: number; createdAt: string }>>(`/exercises/${id}/attempts`),
    startAttempt: (id: string) =>
      request<{ id: string; status: string; resumed: boolean }>(`/exercises/${id}/attempt`, { method: "POST" }),
    submitAnswer: (id: string, answer: string, timeSpent: number, final: boolean) =>
      request<AttemptResult>(`/exercises/${id}/attempt`, {
        method: "PUT",
        body: { answer, timeSpent, final },
      }),
  },

  progress: {
    get: () => request<ProgressData>("/progress"),
    history: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ data: unknown[]; pagination: { total: number } }>(`/progress/history${qs}`);
    },
    leaderboard: (limit = 10, specialty?: string) => {
      const qs = specialty ? `?limit=${limit}&specialty=${specialty}` : `?limit=${limit}`;
      return request<{ leaderboard: Array<{ userId: string; email: string; averageScore: number; completedCount: number }> }>(`/progress/leaderboard${qs}`);
    },
  },

  admin: {
    dashboard: () => request<AdminDashboard>("/admin/dashboard"),
    specialties: {
      list: () => request<unknown[]>("/admin/specialties"),
      create: (data: unknown) => request<unknown>("/admin/specialties", { method: "POST", body: data }),
      update: (id: string, data: unknown) => request<unknown>(`/admin/specialties/${id}`, { method: "PUT", body: data }),
      delete: (id: string) => request<{ ok: boolean }>(`/admin/specialties/${id}`, { method: "DELETE" }),
    },
    symptoms: {
      list: () => request<unknown[]>("/admin/symptoms"),
      create: (data: unknown) => request<unknown>("/admin/symptoms", { method: "POST", body: data }),
      update: (id: string, data: unknown) => request<unknown>(`/admin/symptoms/${id}`, { method: "PUT", body: data }),
      delete: (id: string) => request<{ ok: boolean }>(`/admin/symptoms/${id}`, { method: "DELETE" }),
    },
    diagnoses: {
      list: () => request<unknown[]>("/admin/diagnoses"),
      create: (data: unknown) => request<unknown>("/admin/diagnoses", { method: "POST", body: data }),
      update: (id: string, data: unknown) => request<unknown>(`/admin/diagnoses/${id}`, { method: "PUT", body: data }),
      delete: (id: string) => request<{ ok: boolean }>(`/admin/diagnoses/${id}`, { method: "DELETE" }),
    },
    exercises: {
      list: () => request<unknown[]>("/admin/exercises"),
      get: (id: string) => request<unknown>(`/admin/exercises/${id}`),
      create: (data: unknown) => request<unknown>("/admin/exercises", { method: "POST", body: data }),
      update: (id: string, data: unknown) => request<unknown>(`/admin/exercises/${id}`, { method: "PUT", body: data }),
      delete: (id: string) => request<{ ok: boolean }>(`/admin/exercises/${id}`, { method: "DELETE" }),
    },
    users: {
      list: (page = 1, limit = 20) => request<{ data: unknown[]; pagination: { total: number } }>(`/admin/users?page=${page}&limit=${limit}`),
      get: (id: string) => request<{ user: unknown }>(`/admin/users/${id}`),
      changeRole: (id: string, role: string) => request<{ user: unknown }>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
      toggleActive: (id: string) => request<{ user: unknown }>(`/admin/users/${id}/toggle-active`, { method: "PATCH" }),
      delete: (id: string) => request<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
    },
  },
};

export interface ExerciseDetail {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  specialty: { slug: string; name: string };
  robotPreset: {
    modelVersion: string;
    zoneOverrides: Array<{
      zone: string;
      color: string;
      intensity: number;
      symptomIds?: string[];
    }>;
  };
  symptoms: Array<{
    id: string;
    name: string;
    bodyZone: string;
    severity: number;
    color: string;
    description: string;
  }>;
  diagnosesCount: number;
  diagnoses: Array<{ id: string; name: string }>;
  images: string[];
}

export interface AttemptResult {
  isCorrect: boolean;
  score: number;
  completed: boolean;
  answerDetails?: {
    id: string;
    name: string;
    description: string;
    treatments: string[];
  };
  correctDiagnosis?: {
    id: string;
    name: string;
    description: string;
    treatments: string[];
  };
}

export interface ProgressData {
  summary: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    bestScore: number;
    totalTimeSpent: number;
  };
  bySpecialty: Array<{
    slug: string;
    nameEn: string;
    nameRu: string;
    total: number;
    completed: number;
    averageScore: number;
  }>;
  recentAttempts: Array<{
    id: string;
    exerciseTitle: string;
    specialty: string;
    status: string;
    score: number;
    timeSpent: number;
    createdAt: string;
  }>;
}

export interface AdminDashboard {
  users: { total: number; students: number; admins: number; active: number };
  content: { specialties: number; exercises: number; symptoms: number; diagnoses: number };
  attempts: { total: number; completed: number; completionRate: number; averageScore: number };
  exercisesBySpecialty: Array<{ id: string; slug: string; nameEn: string; nameRu: string; exerciseCount: number }>;
  recentActivity: Array<{ id: string; user: string; exercise: string; score: number; status: string }>;
}
