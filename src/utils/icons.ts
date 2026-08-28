import {
  AlertCircle,
  Archive,
  Bookmark,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Folder,
  Home,
  KeyRound,
  Lock,
  Mail,
  Star,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

export interface IconSpec {
  icon: LucideIcon;
  color: string;
}

/** Deterministic icon+color for each navigation category. */
export function categoryIcon(category: string): IconSpec {
  switch (category) {
    case 'all':
      return { icon: Home, color: 'text-primary' };
    case 'pinned':
      return { icon: Bookmark, color: 'text-rose-500' };
    case 'favorites':
      return { icon: Star, color: 'text-amber-500' };
    case 'recent':
      return { icon: Clock, color: 'text-sky-500' };
    case 'archived':
      return { icon: Archive, color: 'text-slate-500' };
    case 'trash':
      return { icon: Trash2, color: 'text-red-500' };
    case 'locked':
      return { icon: Lock, color: 'text-violet-500' };
    case 'tasks':
      return { icon: CheckCircle2, color: 'text-green-500' };
    default:
      return { icon: Folder, color: 'text-primary' };
  }
}

/** Attach an icon to a "quick action" string. */
export function actionIcon(action: string): IconSpec {
  switch (action) {
    case 'new-note':
      return { icon: FileText, color: 'text-primary' };
    case 'new-folder':
      return { icon: Folder, color: 'text-orange-500' };
    case 'new-tag':
      return { icon: Tag, color: 'text-emerald-500' };
    case 'note':
      return { icon: Circle, color: 'text-muted-foreground' };
    case 'email':
      return { icon: Mail, color: 'text-muted-foreground' };
    case 'lock':
      return { icon: KeyRound, color: 'text-muted-foreground' };
    case 'error':
      return { icon: AlertCircle, color: 'text-red-500' };
    default:
      return { icon: Circle, color: 'text-muted-foreground' };
  }
}