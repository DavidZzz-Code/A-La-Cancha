import RemoteAgendaScreen from '../src/features/remote-agenda/RemoteAgendaScreen';
import { Redirect, useRouter } from 'expo-router';
import { Button, Label, Page } from '../src/components/ui';
import { useAuth } from '../src/features/auth/AuthProvider';
import { supabase } from '../src/features/auth/client';
import { AccountPanel } from '../src/features/auth/AccountPanel';
import ExploreScreen from '../src/features/discovery/ExploreScreen';



export default function HomeScreen() {
  const {session,loading,role,retryRole}=useAuth();
  const router=useRouter();
  if(loading||session&&role==='loading')return <Page><Label>Cargando cuenta…</Label></Page>;
  if(session&&role==='error')return <Page><Button onPress={retryRole}>Reintentar acceso</Button></Page>;
  return session ? role==='owner'?<Redirect href="/owner-home"/>:<RemoteAgendaScreen/> : supabase ? <Page>
    <AccountPanel/>
    <Button secondary onPress={()=>router.push('/remote-agenda')}>Explorar canchas como invitado</Button>
  </Page> : <ExploreScreen/>;
}

