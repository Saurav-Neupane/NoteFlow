import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Moon,
  Sun,
  Palette,
  Type,
  LayoutGrid,
  LogOut,
  Sliders,
  Database,
  Globe,
  Shield,
  Info,
  User,
  Mail,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ACCENT_COLORS, FONT_SIZES } from '@/constants';
import { useSettingsStore, useUIStore } from '@/stores';
import { useSettings, useSaveSettings, useSession } from '@/hooks';
import { exportBackup } from '@/utils/export';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import type { AuthSessionUser } from '@/services/auth.service';
import type { ThemeMode } from '@/types';

interface SettingsProps {
  userId: string;
  user: AuthSessionUser;
}

/** App settings: theme, accent, font, editor, backup, account. */
export function SettingsPage({ userId, user }: SettingsProps) {
  const { settings, update } = useSettingsStore();
  const ui = useUIStore();
  const navigate = useNavigate();
  const { signOut } = useSession();
  const saveMutation = useSaveSettings();
  const queryClient = useQueryClient();

  useSettings(userId);

  /** Persist a settings change, applying DOM side effects immediately so the
   *  UI reflects it without waiting for the server round-trip. */
  function commit(patch: Partial<typeof settings>) {
    const next = { ...settings, ...patch };
    update(patch);
    ui.applySettings(next);
    saveMutation.mutate({ userId, settings: next });
  }

  function applyTheme(mode: ThemeMode) {
    commit({ theme: mode });
  }

  function applyAccent(accent: string) {
    commit({ accent });
  }

  function apply<K extends keyof typeof settings>(k: K, v: (typeof settings)[K]) {
    commit({ [k]: v } as Partial<typeof settings>);
  }

  function onBackup() {
    import('@/services/backup.service')
      .then((m) => m.exportBackupJson(userId))
      .then((payload) => {
        exportBackup(payload.notes);
        toast.success('Backup downloaded');
      })
      .catch(() => toast.error('Backup failed'));
  }

  function onImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      toast.loading('Restoring backup…', { id: 'import' });
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const mod = await import('@/services/backup.service');
        const count = await mod.importBackupJson(userId, payload);
        await queryClient.invalidateQueries({ queryKey: ['notes'] });
        toast.success(`Restored ${count} ${count === 1 ? 'note' : 'notes'}`, { id: 'import' });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Import failed', { id: 'import' });
      }
    };
    input.click();
  }

  const initials = (user.email || 'U')[0].toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalize your NoteFlow experience.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{user.fullName ?? 'NoteFlow user'}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary">Free</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            <p className="font-semibold">Appearance</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Sun className="h-3.5 w-3.5" /> Theme</p>
            <RadioGroup value={settings.theme} onValueChange={(v) => applyTheme(v as ThemeMode)} className="flex gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <Label key={mode} className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={mode} />
                  {mode}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Palette className="h-3.5 w-3.5" /> Accent color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => applyAccent(c.value)}
                  title={c.name}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${settings.accent === c.value ? 'ring-2 ring-ring ring-offset-2' : ''}`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Type className="h-3.5 w-3.5" /> Font size</p>
            <RadioGroup value={settings.font_size} onValueChange={(v) => apply('font_size', v as typeof settings.font_size)} className="flex gap-2">
              {FONT_SIZES.map((s) => (
                <Label key={s} className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={s} />
                  {s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"><LayoutGrid className="h-3.5 w-3.5" /> Default view</p>
            <Select value={settings.view_mode} onValueChange={(v) => apply('view_mode', v as typeof settings.view_mode)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Sliders className="h-4 w-4 text-primary" /><p className="font-semibold">Preferences</p></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow label="Auto-save" description="Save changes as you type" checked={settings.auto_save} onChange={(v) => apply('auto_save', v)} />
          <ToggleRow label="Reduced motion" description="Minimize animations" checked={settings.reduce_motion} onChange={(v) => apply('reduce_motion', v)} />
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /><p className="font-semibold">Data</p></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onBackup}><Database className="h-4 w-4" /> Export backup</Button>
            <Button variant="ghost" onClick={onImport}>Import backup</Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /><p className="font-semibold">Account</p></div>
        </CardHeader>
        <CardContent className="space-y-3">
          <NavRow icon={User} label="Profile" onClick={() => toast('Profile editing coming soon', { icon: '👤' })} />
          <NavRow icon={Mail} label="Email preferences" onClick={() => toast('Coming soon', { icon: '✉️' })} />
          <NavRow icon={Globe} label="Privacy" onClick={() => toast('Privacy policy', { icon: '🔒' })} />
          <NavRow icon={Info} label="About NoteFlow" onClick={() => toast('NoteFlow v1.0', { icon: '✨' })} />
          <Button variant="destructive" className="w-full" onClick={async () => { await signOut(); navigate('/auth'); }}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card/60">{children}</motion.div>;
}
function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-5 pt-4 pb-2">{children}</div>;
}
function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NavRow({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}