'use client';

import { useState, type ButtonHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UpgradeButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  label?: string;
  children?: React.ReactNode;
  onCheckoutStart?: () => void;
}

export function UpgradeButton({
  label = 'Desbloquear Plan Pro',
  children,
  className,
  disabled,
  onCheckoutStart,
  ...rest
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    onCheckoutStart?.();
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        toast.error('No pudimos iniciar el pago. Intentá de nuevo.');
        return;
      }

      const data = (await res.json()) as { initPoint?: string };
      if (!data.initPoint) {
        toast.error('No pudimos iniciar el pago. Intentá de nuevo.');
        return;
      }

      window.location.assign(data.initPoint);
    } catch {
      toast.error('Hubo un error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
          Iniciando pago…
        </span>
      ) : (
        (children ?? label)
      )}
    </button>
  );
}