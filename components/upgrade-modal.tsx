'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UpgradeButton } from '@/components/upgrade-button';
import { UpgradeResourceType, FREE_TIER_LIMITS } from '@/lib/limits';
import {
  PRO_PLAN_LABEL,
  PRO_PLAN_OFFER_BADGE,
  PRO_PLAN_OFFER_DISCOUNT,
  formatProPrice,
  formatProOriginalPrice,
} from '@/lib/pricing';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: UpgradeResourceType;
}

const UPGRADE_CONTENT: Record<UpgradeResourceType, { title: string; description: string }> = {
  recipes: {
    title: '¡Tu recetario está creciendo!',
    description: `El plan gratuito incluye hasta ${FREE_TIER_LIMITS.recipes} recetas. Desbloqueá el Plan Pro para crearlas sin límites.`,
  },
  ingredients: {
    title: '¡Tu inventario está creciendo!',
    description: `El plan gratuito incluye hasta ${FREE_TIER_LIMITS.ingredients} ingredientes. Desbloqueá el Plan Pro para agregarlos sin límites.`,
  },
  products: {
    title: '¡Tu catálogo está creciendo!',
    description: `El plan gratuito incluye hasta ${FREE_TIER_LIMITS.products} producto. Desbloqueá el Plan Pro para crearlos sin límites.`,
  },
};

export function UpgradeModal({ open, onOpenChange, resourceType }: UpgradeModalProps) {
  const content = UPGRADE_CONTENT[resourceType];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md w-full p-6 rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant">
        <AlertDialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stitch-primary-fixed">
            <span className="material-symbols-outlined text-stitch-primary" style={{ fontSize: 24 }}>workspace_premium</span>
          </div>
          <AlertDialogTitle className="text-center text-base font-bold text-stitch-on-surface">
            {content.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm text-stitch-secondary">
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Oferta de Lanzamiento */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="line-through text-gray-400 text-sm">
              {formatProOriginalPrice()}
            </span>
            <span className="rounded-full bg-[#ffd9de]/70 text-[#b80049] text-xs font-bold px-2.5 py-1">
              {PRO_PLAN_OFFER_BADGE}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-500 text-xs font-semibold px-2 py-1">
              {PRO_PLAN_OFFER_DISCOUNT}
            </span>
          </div>
          <div
            className="text-3xl font-extrabold tracking-tight text-stitch-on-surface"
            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            {formatProPrice()}{' '}
            <span className="text-sm font-normal text-stitch-secondary">/ 30 días</span>
          </div>
        </div>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-6 items-center justify-end">
          <AlertDialogCancel
            className="w-full sm:w-auto text-sm py-2.5 px-4 h-auto rounded-md border border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface font-semibold hover:bg-stitch-surface-container-low transition-colors"
          >
            Quizás más tarde
          </AlertDialogCancel>
          <UpgradeButton
            onCheckoutStart={() => onOpenChange(false)}
            label={`Desbloquear Plan Pro · ${PRO_PLAN_LABEL}`}
            className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 h-auto whitespace-normal sm:whitespace-nowrap rounded-md bg-stitch-primary text-on-primary hover:bg-stitch-surface-tint transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}