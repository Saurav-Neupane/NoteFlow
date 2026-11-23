import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Eye, EyeOff, LockKeyhole, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { createSecret, deleteSecret, listSecrets, revealSecret, type LockedSecret } from '@/features/lock-anything/service';
import { localDateTimeToUtc } from '@/features/lock-anything/time';

const durations = [1, 7, 15, 30, 60, 90];
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const dateLabel = (value: string, zone: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: zone }).format(new Date(value));

export function LockAnythingPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<LockedSecret[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState('');
  const [secret, setSecret] = useState('');
  const [confirm, setConfirm] = useState('');
  const [zone, setZone] = useState(localZone);
  const [duration, setDuration] = useState<number | 'custom'>(30);
  const [unlockAt, setUnlockAt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await listSecrets();
      setRecords(result.secrets); setServerTime(result.serverTime); setOffline(false);
    } catch { setOffline(true); toast.error('Could not verify with the server. Secrets remain hidden.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const onFocus = () => void refresh(); window.addEventListener('focus', onFocus); return () => window.removeEventListener('focus', onFocus); }, [refresh]);
  useEffect(() => { const timer = window.setInterval(() => setServerTime((v) => v ? new Date(Date.parse(v) + 1000).toISOString() : v), 1000); return () => window.clearInterval(timer); }, []);

  const current = records.find((item) => item.id === selected) ?? null;
  // State comes only from the latest backend response, never from a local deadline comparison.
  const isActive = (item: LockedSecret) => item.status === 'ACTIVE';
  const remaining = (() => {
    if (!current || !serverTime || !isActive(current)) return null;
    let seconds = Math.max(0, Math.floor((Date.parse(current.unlockAt) - Date.parse(serverTime)) / 1000));
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60); seconds %= 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  })();
  useEffect(() => {
    if (current && serverTime && Date.parse(serverTime) >= Date.parse(current.unlockAt) && current.status === 'ACTIVE') void refresh();
  }, [current, serverTime, refresh]);

  async function save() {
    if (secret !== confirm) { toast.error('The secret entries do not match.'); return; }
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); } catch { toast.error('Enter a valid IANA timezone.'); return; }
    if (duration === 'custom' && !unlockAt) { toast.error('Select an unlock date and time.'); return; }
    setBusy(true);
    try {
      const record = await createSecret({ title, secret, timezone: zone, ...(duration === 'custom' ? { unlockAt: localDateTimeToUtc(unlockAt, zone).toISOString() } : { durationDays: duration }) });
      setRecords((old) => [record, ...old]); setServerTime(record.serverTime); setSelected(record.id); setForm(false); setConfirming(false);
      setTitle(''); setSecret(''); setConfirm(''); toast.success('Secret locked successfully.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create lock.'); }
    finally { setBusy(false); }
  }
  async function reveal() {
    if (!current) return; setBusy(true);
    try { const result = await revealSecret(current.id); setRevealed(result.secret); setServerTime(result.serverTime); setRecords((items) => items.map((item) => item.id === current.id ? { ...item, status: 'EXPIRED', serverTime: result.serverTime } : item)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not verify expiration.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!current) return;
    setBusy(true); try { await deleteSecret(current.id); setRecords((items) => items.filter((item) => item.id !== current.id)); setSelected(null); setRevealed(null); toast.success('Secret deleted.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete secret.'); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-6 py-6">
    <Button variant="ghost" onClick={() => current || form ? (setSelected(null), setForm(false), setConfirming(false), setRevealed(null)) : navigate('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    {!current && !form && <>
      <header className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-primary"><LockKeyhole className="h-5 w-5"/><span className="text-sm font-semibold">PRIVATE VAULT</span></div><h1 className="text-3xl font-bold">Lock Anything</h1><p className="mt-2 text-muted-foreground">Keep a secret hidden until the time you choose. Protected by your NoteFlow account.</p></div><Button onClick={() => setForm(true)}><Plus className="mr-2 h-4 w-4"/>Create New Lock</Button></header>
      {offline && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">Your selected unlock time may have arrived. Connect to verify and access your secret. Secrets cannot be revealed offline.</p>}
      {loading ? <p className="text-muted-foreground">Loading vault…</p> : records.length === 0 ? <Card className="p-8 text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary"/><h2 className="font-semibold">Nothing locked yet</h2><p className="mt-1 text-sm text-muted-foreground">Create your first time-locked secret.</p></Card> : <div className="space-y-3">{records.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className="w-full rounded-2xl border bg-card p-5 text-left transition hover:border-primary/40"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{item.title}</div><div className="mt-1 text-sm text-muted-foreground">Unlocks {dateLabel(item.unlockAt, item.timezone)} · {item.timezone}</div></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{isActive(item) ? 'Locked' : 'Ready'}</span></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5"/>••••••••••</div></button>)}</div>}
      <p className="text-xs text-muted-foreground">Application-level time lock only. This does not lock your device or other apps.</p>
    </>}
    {form && <Card className="space-y-5 p-6"><div><h1 className="text-2xl font-bold">Create New Lock</h1><p className="mt-1 text-sm text-muted-foreground">Your secret is encrypted before it is stored.</p></div>
      <label className="block space-y-2 text-sm font-medium">Secret name <span className="text-muted-foreground">(optional)</span><Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. My App PIN" autoComplete="off"/></label>
      <label className="block space-y-2 text-sm font-medium">Secret content<Textarea value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Enter the text you want to lock" autoComplete="off" maxLength={10000} /></label>
      <label className="block space-y-2 text-sm font-medium">Confirm secret<Textarea value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Enter it again to confirm" autoComplete="off" maxLength={10000}/></label>
      <label className="block space-y-2 text-sm font-medium">Display timezone (IANA)<Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Asia/Kathmandu"/></label>
      <div><div className="mb-2 text-sm font-medium">Lock duration</div><div className="flex flex-wrap gap-2">{durations.map((days) => <Button key={days} type="button" variant={duration === days ? 'default' : 'outline'} size="sm" onClick={() => setDuration(days)}>{days} day{days > 1 ? 's' : ''}</Button>)}<Button type="button" variant={duration === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setDuration('custom')}>Custom</Button></div></div>
      {duration === 'custom' && <label className="block space-y-2 text-sm font-medium">Unlock date &amp; time<Input type="datetime-local" value={unlockAt} onChange={(e) => setUnlockAt(e.target.value)}/><span className="block text-xs text-muted-foreground">Custom time uses this device's current timezone. The server validates the resulting instant.</span></label>}
      <p className="rounded-xl bg-muted p-3 text-sm">{duration === 'custom' && unlockAt ? `Unlocks ${new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short', timeZone: zone }).format(localDateTimeToUtc(unlockAt, zone))} (${zone})` : `Unlocks ${duration} days after the server accepts your lock request.`}</p>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(false)}>Cancel</Button><Button disabled={!secret || !confirm || busy} onClick={() => { if (secret !== confirm) toast.error('The secret entries do not match.'); else setConfirming(true); }}>Continue</Button></div>
    </Card>}
    {confirming && form && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"><Card className="w-full max-w-lg space-y-4 p-6"><h2 className="text-xl font-semibold">Final confirmation</h2><p className="text-sm leading-6">You are about to lock this secret until {duration === 'custom' && unlockAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short', timeZone: zone }).format(localDateTimeToUtc(unlockAt, zone)) : `${duration} days after server confirmation`} ({zone}). You will not be able to reveal or copy it before this time. Are you sure you want to continue?</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirming(false)}>Go back</Button><Button disabled={busy} onClick={() => void save()}>{busy ? 'Locking…' : 'Confirm & Lock'}</Button></div></Card></div>}
    {current && <Card className="space-y-5 p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><LockKeyhole/></div><div><div className="text-sm text-muted-foreground">{isActive(current) ? 'ACTIVE LOCK' : 'COMMITMENT COMPLETED'}</div><h1 className="text-2xl font-bold">{current.title}</h1></div></div>
      <div className="rounded-xl border bg-muted/40 p-5"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secret content</div><p className="mt-3 select-none font-mono text-lg tracking-widest">{revealed && !isActive(current) ? revealed : '••••••••••••••••'}</p><p className="mt-2 text-xs text-muted-foreground">{isActive(current) ? 'Hidden until the server verifies your unlock time.' : revealed ? 'Visible only on this screen.' : 'Ready to reveal after server verification.'}</p></div>
      <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Started</span><div>{dateLabel(current.createdAt, current.timezone)}</div></div><div><span className="text-muted-foreground">Unlock time</span><div>{dateLabel(current.unlockAt, current.timezone)}</div></div></div>
      {isActive(current) ? <><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(99, Math.max(1, 100 - ((Date.parse(serverTime ?? current.createdAt) - Date.parse(current.createdAt)) / Math.max(1, Date.parse(current.unlockAt) - Date.parse(current.createdAt))) * 100))}%` }}/></div><p className="text-center font-mono text-muted-foreground">{offline ? 'Verification required' : remaining ?? 'Checking server time…'}</p></> : <div className="flex flex-wrap gap-2">{!revealed ? <Button disabled={busy || offline} onClick={() => void reveal()}><Eye className="mr-2 h-4 w-4"/>Reveal Secret</Button> : <><Button variant="outline" onClick={() => setRevealed(null)}><EyeOff className="mr-2 h-4 w-4"/>Hide</Button><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(revealed).then(() => toast.success('Secret copied.')).catch(() => toast.error('Clipboard unavailable.')); }}><Copy className="mr-2 h-4 w-4"/>Copy Secret</Button></>}<Button variant="destructive" disabled={busy} onClick={() => void remove()}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button></div>}
      <Button variant="ghost" onClick={() => { setSelected(null); setRevealed(null); }}>Back to vault</Button>
    </Card>}
  </div>;
}
