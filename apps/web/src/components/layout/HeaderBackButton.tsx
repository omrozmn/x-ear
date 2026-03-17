import { ArrowLeft } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { cn } from '@/lib/utils';

interface HeaderBackButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function HeaderBackButton({ label, onClick, className }: HeaderBackButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={cn(
        'h-auto rounded-2xl px-0 py-0 text-sm font-medium text-slate-500 hover:bg-transparent hover:text-primary dark:text-slate-400 dark:hover:text-blue-300',
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 rounded-2xl border border-transparent px-1 py-1 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {label}
      </span>
    </Button>
  );
}
