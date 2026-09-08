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
import { PRO_PLAN_LABEL } from '@/lib/pricing';

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
      <AlertDialogContent className="max-w-sm rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant">
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
        <AlertDialogFooter className="mt-2 sm:flex-row gap-2">
          <AlertDialogCancel
            className="flex-1 rounded-md border border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface font-semibold text-sm py-2.5 hover:bg-stitch-surface-container-low transition-colors"
          >
            Quizás más tarde
          </AlertDialogCancel>
          <UpgradeButton
            onCheckoutStart={() => onOpenChange(false)}
            label={`Desbloquear Plan Pro · ${PRO_PLAN_LABEL}`}
            className="flex-1 rounded-md bg-stitch-primary text-on-primary font-semibold text-sm py-2.5 hover:bg-stitch-surface-tint transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}