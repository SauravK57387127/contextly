let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
    currentAccessToken = token;
}

export function getCurrentAccessToken() {
    return currentAccessToken;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiOptions {
    method?: string;
    body?: unknown;
    isFormData?: boolean;
}

export async function apiClient(path: string, options: ApiOptions = {}) {
    const headers: Record<string, string> = {};
    if (currentAccessToken)
        headers["Authorization"] = `Bearer ${currentAccessToken}`;
    if (!options.isFormData) headers["Content-Type"] = "application/json";

    const res = await fetch(`${BASE_URL}${path}`, {
        method: options.method ?? "GET",
        headers,
        credentials: "include", // sends/receives the httpOnly refresh cookie
        body: options.isFormData
            ? (options.body as FormData)
            : options.body
              ? JSON.stringify(options.body)
              : undefined,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Something went wrong");
    return data;
}
