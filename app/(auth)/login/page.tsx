"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, Eye, EyeOff, Loader2 } from "lucide-react";

const OAUTH_ERRORS: Record<string, string> = {
  unauthorized: "Esta cuenta de Google no tiene permisos para acceder al sistema.",
  auth_error: "Ocurrió un error durante la autenticación con Google. Intenta de nuevo.",
  no_code: "No se recibió el código de autenticación. Intenta de nuevo.",
  no_user: "No se pudo identificar al usuario. Intenta de nuevo.",
};

// Componente interno que usa useSearchParams (requiere Suspense boundary)
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && OAUTH_ERRORS[errorParam]) {
      setError(OAUTH_ERRORS[errorParam]);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        setError("No tienes permisos para acceder al sistema de gestión.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    setLoadingGoogle(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError("No se pudo iniciar el proceso con Google. Intenta de nuevo.");
      setLoadingGoogle(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, var(--accent) 0%, transparent 50%), 
                           radial-gradient(circle at 75% 75%, #4B8BE8 0%, transparent 50%)`,
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "var(--accent-muted)", border: "1px solid var(--accent)" }}
          >
            <Camera size={32} style={{ color: "var(--accent)" }} />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            FotosMony
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Sistema de Gestión Interno
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Iniciar sesión
          </h2>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-5"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              opacity: loadingGoogle || loading ? 0.6 : 1,
            }}
          >
            {loadingGoogle ? (
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loadingGoogle ? "Redirigiendo a Google..." : "Continuar con Google"}
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              o ingresa con email
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@fotosmony.cl"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "var(--danger)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingGoogle}
              className="btn-primary w-full justify-center mt-2"
              style={{ opacity: loading || loadingGoogle ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          Solo para administradores de FotosMony
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
