'use client';

type Props = {
  isReorderMode: boolean;
  isSavingOrder: boolean;
  onEnterReorderMode: () => void;
  onCancelReorder: () => void;
  onSaveOrder: () => void;
};

export default function ProjectsReorderBar({
  isReorderMode,
  isSavingOrder,
  onEnterReorderMode,
  onCancelReorder,
  onSaveOrder,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mb-8">
      {isReorderMode ? (
        <>
          <button
            onClick={onCancelReorder}
            disabled={isSavingOrder}
            className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSaveOrder}
            disabled={isSavingOrder}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingOrder ? 'Saving…' : 'Save order'}
          </button>
        </>
      ) : (
        <button
          onClick={onEnterReorderMode}
          className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
        >
          Edit order
        </button>
      )}
    </div>
  );
}
