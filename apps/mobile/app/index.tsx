import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Button, Heading, Label, Page } from '../src/components/ui';
import { useAuth } from '../src/features/auth/AuthProvider';
import { supabase } from '../src/features/auth/client';
import { AccountPanel } from '../src/features/auth/AccountPanel';
import ExploreScreen from '../src/features/discovery/ExploreScreen';

type Match = { team:string; starts_at:string; courts:{name:string}|null };
type Home = {role:'owner'} | {role:'player';match:Match|null} | {role:'error'};

export default function HomeScreen() {
  const {session,loading}=useAuth();
  const router=useRouter();
  const [revision,setRevision]=useState(0);
  if(loading)return <Page><Label>Cargando cuenta.</Label></Page>;
  return session ? <AccountHome key={session.user.id+revision} actor={session.user.id} retry={()=>setRevision(n=>n+1)}/> : supabase ? <Page>
    <AccountPanel/>
    <Button secondary onPress={()=>router.push('/remote-agenda')}>Explorar canchas como invitado</Button>
  </Page> : <ExploreScreen/>;
}

function AccountHome({actor,retry}:{actor:string;retry:()=>void}) {
  const router=useRouter();
  const [home,setHome]=useState<Home|null>(null);
  useFocusEffect(useCallback(()=>{
    const controller=new AbortController();
    async function load():Promise<Home> {
      if(!supabase)throw Error();
      const membership=await supabase.from('venue_members').select('venue_id').eq('user_id',actor).limit(1).abortSignal(controller.signal);
      if(membership.error)throw membership.error;
      if(membership.data.length)return {role:'owner'};
      const next=await supabase.from('reservations').select('team,starts_at,courts(name)').eq('actor_id',actor)
        .eq('kind','player').eq('status','confirmed').gte('starts_at',new Date().toISOString()).order('starts_at')
        .limit(1).abortSignal(controller.signal).maybeSingle();
      if(next.error)throw next.error;
      return {role:'player',match:next.data as unknown as Match|null};
    }
    setHome(null);
    load().then(value=>{if(!controller.signal.aborted)setHome(value);})
      .catch(()=>{if(!controller.signal.aborted)setHome({role:'error'});});
    return ()=>controller.abort();
  },[actor]));
  if(home?.role==='owner')return <Redirect href="/owner-agenda"/>;
  return <Page><Heading title="Mi próximo partido"/>
    {!home ? <Label>Consultando tu agenda.</Label> : home.role==='error' ? <View>
      <Label>No pudimos cargar tu inicio. Revisa la conexión.</Label><Button onPress={retry}>Reintentar</Button>
    </View> : <View style={{gap:16}}>
      {home.match ? <><Label>{home.match.team} · {home.match.courts?.name ?? 'Cancha reservada'}</Label>
        <Label>{new Date(home.match.starts_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})} · Hora de Colombia</Label></> :
        <Label>Aún no tienes partidos confirmados por jugar.</Label>}
      <Button onPress={()=>router.push('/remote-agenda')}>Buscar cancha</Button>
      <Button secondary onPress={()=>router.push('/remote-reservations')}>Ver mis reservas</Button>
    </View>}
  </Page>;
}
