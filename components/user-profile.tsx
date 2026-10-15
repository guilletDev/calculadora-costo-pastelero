'use client';

import { useAppBoot } from '@/components/boot/app-boot-context';

interface UserProfileProps {
  /** Tamaño del avatar en px */
  size?: number;
  /** Mostrar nombre y email además del avatar */
  showDetails?: boolean;
}

export function UserProfile({ size = 36, showDetails = false }: UserProfileProps) {
  // El usuario se reutiliza del contexto de boot (sin consultas propias).
  const { user } = useAppBoot();

  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name || meta.name || user.email?.split('@')[0] || 'Usuario';
  const email: string = user.email ?? '';
  const avatarUrl: string | null = meta.avatar_url || meta.picture || null;

  // Iniciales: primera letra de cada palabra (máx. 2)
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarStyle = { width: size, height: size, minWidth: size, minHeight: size };

  return (
    <div className="flex items-center gap-2.5">
      {/* Avatar */}
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="rounded-full object-cover ring-2 ring-[#ee2b6c]/20"
          style={avatarStyle}
        />
      ) : (
        <div
          className="rounded-full bg-[#ee2b6c] flex items-center justify-center text-white font-bold ring-2 ring-[#ee2b6c]/20 shrink-0"
          style={{ ...avatarStyle, fontSize: Math.round(size * 0.38) }}
          aria-label={name}
        >
          {initials}
        </div>
      )}

      {/* Nombre + email (opcional, para dropdown o vistas grandes) */}
      {showDetails && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</span>
        </div>
      )}
    </div>
  );
}
