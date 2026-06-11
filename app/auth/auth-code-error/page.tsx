export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#f8f6f6] dark:bg-[#221016]">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-[#1a0c10] border border-[#ee2b6c]/10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>error</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Error de autenticación
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hubo un problema al iniciar sesión. Por favor, intentá de nuevo.
          </p>
        </div>

        <a
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee2b6c] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d4245f]"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Volver al inicio de sesión
        </a>
      </div>
    </div>
  );
}
