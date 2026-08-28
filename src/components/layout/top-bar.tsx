import { useNavigate } from 'react-router-dom';
import { Command, Menu, Search, Moon, Sun, LayoutGrid, Table2, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useUIStore } from '@/stores';
import { useIsDesktop, useSession } from '@/hooks';
import { greetingFor, formatFullDate } from '@/utils/date';
import type { AuthSessionUser } from '@/services/auth.service';

interface TopBarProps {
  user: AuthSessionUser;
  onMenuToggle: () => void;
  onSearchFocus: () => void;
}

/** Top app bar: greeting + date, search, profile, view toggles. */
export function TopBar({ user, onMenuToggle, onSearchFocus }: TopBarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme, viewMode, setViewMode, setCommandSearchOpen } = useUIStore();
  const isDesktop = useIsDesktop();
  const { signOut } = useSession();

  const initials = (user.fullName || user.email || 'N')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <header className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden flex-col md:flex">
        <h1 className="font-display text-lg font-bold leading-tight">{greetingFor()}, {user.fullName?.split(' ')[0] || 'there'}</h1>
        <p className="text-xs text-muted-foreground">{formatFullDate(new Date().toISOString())}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setCommandSearchOpen(true)}
          className="glass hidden w-56 items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px]">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onSearchFocus}>
            <Search className="h-5 w-5" />
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>

        {isDesktop && (
          <div className="inline-flex rounded-xl bg-muted p-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-background shadow-sm' : ''}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-background shadow-sm' : ''}>
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1" aria-label="Account menu">
              <Avatar className="h-9 w-9 ring-2 ring-primary/30 transition-shadow hover:ring-primary">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{user.fullName ?? 'NoteFlow user'}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}