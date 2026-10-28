'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { TransitionLink } from '@/components/transition-link';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/lib/cost';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type EstadoPedido = 'pendiente' | 'en_preparacion' | 'entregado';

interface PedidoRecipeItem {
  recipeId?: string | null;
  name?: string | null;
  quantity?: number;
  cost?: number;
}

interface PedidoExpenseItem {
  key?: string | null;
  label?: string | null;
  amount?: number;
}

interface PedidoRow {
  id: string;
  client_name: string;
  client_phone: string | null;
  title: string | null;
  recipes: PedidoRecipeItem[] | null;
  expenses: PedidoExpenseItem[] | null;
  sale_price: number;
  total_cost: number;
  deposit: number;
  status: EstadoPedido;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_META: Record<EstadoPedido, { label: string; badgeClass: string }> = {
  pendiente: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  en_preparacion: {
    label: 'En preparación',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  entregado: {
    label: 'Entregado',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

const manrope = { fontFamily: 'var(--font-manrope), sans-serif' } as const;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizePhone(phone: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

interface OrderCardProps {
  pedido: PedidoRow;
  isUpdating: boolean;
  onUpdateStatus: (pedido: PedidoRow, next: EstadoPedido) => void;
  onDelete: (pedido: PedidoRow) => void;
}

function OrderCard({ pedido, isUpdating, onUpdateStatus, onDelete }: OrderCardProps) {
  const meta = STATUS_META[pedido.status] ?? STATUS_META.pendiente;
  const createdAt = formatDate(pedido.created_at);
  const deliveryDate = formatDate(pedido.delivery_date);
  const phoneDigits = normalizePhone(pedido.client_phone);

  const recipes = pedido.recipes ?? [];
  const expenses = pedido.expenses ?? [];

  const salePrice = Number(pedido.sale_price) || 0;
  const deposit = Number(pedido.deposit) || 0;
  const balance = Math.max(salePrice - deposit, 0);

  return (
    <article className="bg-white rounded-[24px] border border-[#e4bdc2]/40 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] space-y-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-[20px] leading-[1.3] text-[#151c27] truncate">
            {pedido.title?.trim() || 'Pedido'}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#5f5e5e]">
            <span className="font-medium text-[#151c27]">{pedido.client_name}</span>
            {pedido.client_phone && (
              <>
                <span className="text-[#c5c7c8]">·</span>
                <span>{pedido.client_phone}</span>
                {phoneDigits.length >= 8 && (
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#b80049] hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    WhatsApp
                  </a>
                )}
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-[#8a8a8a]">
            Creado el {createdAt}
            {deliveryDate && ` · Entrega: ${deliveryDate}`}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.badgeClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {meta.label}
        </span>
      </header>

      {/* Resumen */}
      <div className="space-y-2 rounded-2xl bg-[#f9f9ff] p-4">
        {recipes.length === 0 && expenses.length === 0 ? (
          <p className="text-sm text-[#8a8a8a]">Sin ítems cargados.</p>
        ) : (
          <>
            {recipes.map((item, index) => (
              <div
                key={`recipe-${index}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-[#151c27]">
                  {item.name ?? 'Receta'}
                  {item.quantity ? (
                    <span className="text-[#8a8a8a]"> · {item.quantity}</span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap font-medium text-[#5f5e5e]">
                  {formatCurrency(Number(item.cost) || 0)}
                </span>
              </div>
            ))}
            {expenses.map((item, index) => (
              <div
                key={`expense-${index}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-[#151c27]">{item.label ?? 'Gasto extra'}</span>
                <span className="whitespace-nowrap font-medium text-[#5f5e5e]">
                  {formatCurrency(Number(item.amount) || 0)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e4bdc2]/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">
            Precio de venta
          </p>
          <p className="mt-1 text-lg font-bold text-[#151c27]">{formatCurrency(salePrice)}</p>
        </div>
        <div className="rounded-xl border border-[#e4bdc2]/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">
            Seña
          </p>
          <p className="mt-1 text-lg font-bold text-[#151c27]">{formatCurrency(deposit)}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-[#b80049]/30 bg-[#fdf3f6] p-3 sm:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#b80049]">
            Saldo pendiente
          </p>
          <p className="mt-1 text-lg font-bold text-[#b80049]">{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Notas */}
      {pedido.notes && (
        <p className="whitespace-pre-line text-sm leading-[1.6] text-[#5f5e5e]">
          <span className="font-semibold text-[#151c27]">Notas: </span>
          {pedido.notes}
        </p>
      )}

      {/* Acciones */}
      <footer className="flex flex-col gap-3 border-t border-[#e4bdc2]/30 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8a8a8a]">
            Estado
          </span>
          <Select
            value={pedido.status}
            onValueChange={(value) => onUpdateStatus(pedido, value as EstadoPedido)}
            disabled={isUpdating}
          >
            <SelectTrigger className="!h-auto w-44 rounded-full border border-[#e4bdc2] bg-white px-3 py-2 text-sm text-[#151c27]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              avoidCollisions={false}
              className="rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              {(Object.keys(STATUS_META) as EstadoPedido[]).map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="text-[#151c27] focus:bg-[#ffd9de] focus:text-[#400014]"
                >
                  {STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isUpdating && (
            <span className="material-symbols-outlined animate-spin text-[18px] text-[#b80049]">
              progress_activity
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(pedido)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ba1a1a]/40 px-4 py-2 text-sm font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/50"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          Eliminar pedido
        </button>
      </footer>
    </article>
  );
}

export default function PedidosPage() {
  const { ready, user } = useAppBoot();
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PedidoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        if (!cancelled) setPedidos((data ?? []) as PedidoRow[]);
      } catch (error) {
        console.error('[orders] Error cargando pedidos:', error);
        if (!cancelled) {
          setLoadError(true);
          toast.error('No pudimos cargar tus pedidos. Intentá de nuevo.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, reloadKey]);

  const handleUpdateStatus = async (pedido: PedidoRow, next: EstadoPedido) => {
    if (pedido.status === next || updatingId) return;
    setUpdatingId(pedido.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status: next })
        .eq('id', pedido.id);

      if (error) throw new Error(error.message);

      setPedidos((prev) =>
        prev.map((item) => (item.id === pedido.id ? { ...item, status: next } : item))
      );
      toast.success('Estado actualizado');
    } catch (error) {
      console.error('[orders] Error actualizando estado:', error);
      toast.error(
        error instanceof Error ? error.message : 'No pudimos actualizar el estado'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw new Error(error.message);

      setPedidos((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success('Pedido eliminado');
      setDeleteTarget(null);
    } catch (error) {
      console.error('[orders] Error eliminando pedido:', error);
      toast.error(
        error instanceof Error ? error.message : 'No pudimos eliminar el pedido'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 flex flex-col gap-12">
      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
        <div>
          <h1
            className="text-[28px] md:text-[32px] leading-[1.2] md:tracking-[-0.01em] font-bold text-[#151c27] mb-2"
            style={manrope}
          >
            Mis Pedidos
          </h1>
          <p className="text-[#5f5e5e] text-[18px] leading-[1.6]">
            {isLoading
              ? 'Cargando tus pedidos...'
              : pedidos.length === 0
                ? 'Todavía no creaste ningún pedido.'
                : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} registrado${pedidos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <TransitionLink
          href="/dashboard/pedidos/nuevo"
          className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase inline-flex items-center justify-center gap-2 hover:bg-[#bc004b] hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 duration-150 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Nuevo pedido
        </TransitionLink>
      </section>

      {/* ── Contenido ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="animate-pulse rounded-[24px] border border-[#e4bdc2]/30 bg-white p-6 space-y-4"
            >
              <div className="h-5 w-1/3 rounded bg-[#f0f3ff]" />
              <div className="h-4 w-1/2 rounded bg-[#f0f3ff]" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 rounded-xl bg-[#f0f3ff]" />
                <div className="h-16 rounded-xl bg-[#f0f3ff]" />
                <div className="h-16 rounded-xl bg-[#f0f3ff]" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#e4bdc2]/40 bg-white py-16 text-center">
          <span className="material-symbols-outlined mb-3 text-[40px] text-[#ba1a1a]">
            error
          </span>
          <p className="mb-4 text-[#5f5e5e]">No pudimos cargar tus pedidos.</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-full border border-[#b80049] px-6 py-2.5 text-sm font-semibold text-[#b80049] transition-colors hover:bg-[#b80049]/10"
          >
            Reintentar
          </button>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-[#e4bdc2] bg-[#f0f3ff] py-20 text-center">
          <span className="material-symbols-outlined mb-4 text-[48px] text-[#5a5c5d]">
            receipt_long
          </span>
          <h3 className="mb-2 font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={manrope}>
            Todavía no hay pedidos
          </h3>
          <p className="mb-6 max-w-md text-[16px] leading-[1.5] text-[#5f5e5e]">
            Creá tu primer presupuesto para empezar a organizarte.
          </p>
          <TransitionLink
            href="/dashboard/pedidos/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-[#b80049] px-8 py-3 text-[14px] font-semibold uppercase tracking-[0.05em] text-white transition-all hover:bg-[#bc004b] hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Crear primer pedido
          </TransitionLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pedidos.map((pedido) => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              isUpdating={updatingId === pedido.id}
              onUpdateStatus={handleUpdateStatus}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* ── Confirmación de eliminación ── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-sm rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant"
        >
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffdad6]">
              <span className="material-symbols-outlined text-[#ba1a1a]" style={{ fontSize: 24 }}>
                delete
              </span>
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-stitch-on-surface">
              ¿Eliminar pedido?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-stitch-secondary leading-relaxed">
              ¿Estás seguro? Se eliminará definitivamente el pedido de{' '}
              <span className="font-semibold text-stitch-on-surface">
                {deleteTarget?.client_name}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="flex-1 rounded-full border border-gray-300 bg-white text-gray-700 font-medium text-sm py-2.5 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus-visible:ring-0 shadow-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="flex-1 rounded-full bg-[#ba1a1a] text-white font-medium text-sm py-2.5 hover:bg-[#a31313] focus:outline-none focus-visible:ring-0 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>
                    progress_activity
                  </span>
                  Eliminando...
                </span>
              ) : (
                'Eliminar pedido'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
