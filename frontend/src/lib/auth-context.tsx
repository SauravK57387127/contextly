"use client";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { apiClient, setAccessToken } from "./api-client";

interface User {
    id: string;
    email: string;
}
interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    login: (accessToken: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiClient("/auth/refresh", { method: "POST" })
            .then((res) => {
                setAccessToken(res.data.accessToken);
                setUser(res.data.user);
            })
            .catch(() => setAccessToken(null))
            .finally(() => setIsLoading(false));
    }, []);

    function login(accessToken: string, user: User) {
        setAccessToken(accessToken);
        setUser(user);
    }

    async function logout() {
        await apiClient("/auth/logout", { method: "POST" }).catch(() => {});
        setAccessToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
