import {Page,Heading} from '../src/components/ui';
import {useAuth} from '../src/features/auth/AuthProvider';
import {VenueAccess} from '../src/features/profile/VenueAccess';
export default function Courts(){const {session}=useAuth();return <Page back><Heading title="Administrar canchas"/>{session&&<VenueAccess actor={session.user.id}/>}</Page>;}
