import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Label } from '../../components/ui';
import { supabase } from '../auth/client';
import { type AgendaEntry } from './contracts';

export function CancelExternalBooking({ actor, row, onSaved }: { actor: string; row: AgendaEntry; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (row.kind !== 'external' || row.status !== 'confirmed' || Date.parse(row.starts_at) <= Date.now()) return null;
  async function cancel() {
    if (!supabase || busy || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== actor) throw Error();
      const result = await supabase.rpc('transition_reservation', {
        p_id: row.id, p_status: 'cancelled', p_reason: reason.trim(),
      }).single();
      const saved = result.data as Partial<AgendaEntry> | null;
      if (result.error || saved?.id !== row.id || saved.kind !== 'external' || saved.status !== 'cancelled') throw Error();
      onSaved();
    } catch {
      setError('No pudimos verificar la cancelación. Actualiza la agenda para consultar el estado del turno.');
    } finally {
      setBusy(false);
    }
  }
  if (!open) return <Button secondary onPress={() => setOpen(true)}>Cancelar turno presencial</Button>;
  return <View style={{ gap: 8 }}>
    <Label>Al confirmar, el horario de {row.team} volverá a estar disponible.</Label>
    <TextInput accessibilityLabel="Motivo de cancelación" placeholder="Motivo de cancelación" value={reason} onChangeText={setReason} maxLength={200} editable={!busy} style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}/>
    <Button disabled={busy || !reason.trim()} onPress={cancel}>Confirmar cancelación</Button>
    <Button secondary disabled={busy} onPress={() => { setOpen(false); setError(''); setReason(''); }}>Conservar turno</Button>
    {!!error && <Label accessibilityRole="alert">{error}</Label>}
  </View>;
}
