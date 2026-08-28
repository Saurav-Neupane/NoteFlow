import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, FileText, Folder, Tag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color?: string;
}

interface FABProps {
  onCreateNote: () => void;
  extraActions?: FABAction[];
}

/**
 * Animated floating action button. Tapping the main button expands a radial
 * menu of quick actions with a spring "morph" transition.
 */
export function FAB({ onCreateNote, extraActions = [] }: FABProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions: FABAction[] = [
    { id: 'new-note', label: 'New note', icon: FileText, onClick: onCreateNote },
    { id: 'new-folder', label: 'New folder', icon: Folder, onClick: () => navigate('/folders') },
    { id: 'new-tag', label: 'New tag', icon: Tag, onClick: () => navigate('/tags') },
    ...extraActions,
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 16, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.6 }}
              transition={{ delay: (actions.length - i) * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={cn(
                'flex items-center gap-2 rounded-full border border-border bg-popover/90 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md transition-colors hover:bg-accent',
                action.color
              )}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </motion.button>
          ))}
      </AnimatePresence>

      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={() => setOpen((v) => !v)}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            className="fab-gradient relative flex h-14 w-14 items-center justify-center rounded-full focus-ring"
            aria-label={open ? 'Close quick actions' : 'Quick actions'}
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </motion.span>
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={{ boxShadow: open ? '0 0 0 8px hsl(239 84% 67% / 0.12)' : '0 0 0 0px hsl(239 84% 67% / 0)' }}
              transition={{ duration: 0.2 }}
            />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left">{open ? 'Close' : 'Create'}</TooltipContent>
      </Tooltip>
    </div>
  );
}