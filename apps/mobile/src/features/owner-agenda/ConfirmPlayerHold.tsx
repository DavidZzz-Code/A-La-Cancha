import { useState } from 'react';
import { View } from 'react-native';
import { Button, Label } from '../../components/ui';
import { supabase } from '../auth/client';
import type { AgendaEntry } from './contracts';

export function ConfirmPlayerHold({ actor, row, checkedAt, onSaved }: {
  actor: string; row: AgendaEntry; checkedAt: number; onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (row.kind !== 'player' || row.status !== 'held' || !row.expires_at ||
      Math.min(Date.parse(row.starts_at), Date.parse(row.expires_at)) <= checkedAt) return null;

  async function confirm() {
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor) throw Error();
      const response = await supabase.rpc('transition_reservation', { p_id: row.id, p_status: 'confirmed' }).single();
      if (response.error?.code === '22023') {
        setError('El plazo venció o la reserva cambió. Actualiza la agenda para ver su estado.');
        return;
      }
      const saved = response.data as Partial<AgendaEntry> | null;
      if (response.error || saved?.id !== row.id || saved.status !== 'confirmed' || saved.kind !== 'player') throw Error();
      onSaved();
    } catch {
      setError('No pudimos verificar la confirmación. Actualiza la agenda antes de reintentar.');
    } finally {
      setBusy(false);
    }
  }
  return <View style={{ gap: 8 }}>
    <Button disabled={busy || !!error} onPress={confirm}>Confirmar reserva del jugador</Button>
    {!!error && <Label accessibilityRole="alert">{error}</Label>}
  </View>;
}
