import {test,expect,type Page} from '@playwright/test';
const actor='00000000-0000-0000-0000-000000000001';
const court='20000000-0000-0000-0000-000000000001';
const id='30000000-0000-0000-0000-000000000001';
function token(userId:string) {
  const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  return encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:userId,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.test-signature';
}
async function fixture(page:Page, options:{lostCreate?:boolean;conflict?:boolean;lostCancel?:boolean;expired?:boolean}={}) {
  let row:Record<string,unknown>|null=null;let creates=0;let cancels=0;let lost=false;let cancellationLost=false;
  const user={id:actor,aud:'authenticated',role:'authenticated',email:'player@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  await page.route('https://auth-test.supabase.co/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/token'))return route.fulfill({json:{access_token:token(actor),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user}});
    if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
    if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
    if(url.pathname.endsWith('/reservations')) {
      expect(url.searchParams.get('actor_id')).toBe('eq.'+actor);
      const single=url.searchParams.has('idempotency_key') || url.searchParams.has('id');
      const match=row && (!url.searchParams.has('idempotency_key') || url.searchParams.get('idempotency_key')==='eq.'+row.idempotency_key);
      // maybeSingle uses an array representation for GET.
      if(route.request().headers().accept?.includes('vnd.pgrst.object'))return route.fulfill({json:match?row:null});
      return route.fulfill({json:match?[row]:single?[]:row?[row]:[]});
    }
    if(url.pathname.endsWith('/create_reservation')) {
      creates++;
      expect(route.request().headers().accept).toContain('application/vnd.pgrst.object+json');
      expect(JSON.parse(Buffer.from(route.request().headers().authorization.split('.')[1], 'base64url').toString()).sub).toBe(actor);
      if(options.conflict)return route.fulfill({status:409,json:{code:'23P01',message:'conflicting key'}});
      const body=route.request().postDataJSON();expect(body.p_kind).toBe('player');
      expect(body).not.toHaveProperty('p_total');
      row={id,actor_id:actor,court_id:court,idempotency_key:body.p_key,status:'held',starts_at:body.p_date+'T13:00:00Z',ends_at:body.p_date+'T14:00:00Z',expires_at:new Date(Date.now()+(options.expired?-1000:600000)).toISOString(),team:body.p_team,players:body.p_players,total:95000,discount:5000,deposit:28500,balance:66500};
      if(options.lostCreate && !lost){lost=true;return route.abort('connectionreset');}
      return route.fulfill({json:row});
    }
    if(url.pathname.endsWith('/transition_reservation')) {
      cancels++;expect(route.request().headers().accept).toContain('application/vnd.pgrst.object+json');expect(route.request().postDataJSON().p_status).toBe('cancelled');
      row={...row,status:'cancelled'};
      if(options.lostCancel && !cancellationLost){cancellationLost=true;return route.abort('connectionreset');}
      return route.fulfill({json:row});
    }
    return route.abort();
  });
  await page.goto('/profile');
  await page.getByLabel('Correo de la cuenta').fill(user.email);
  await page.getByLabel('Contraseña de la cuenta').fill('fixture-password');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page.getByText('Sesión iniciada: '+user.email)).toBeVisible();
  const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
  await page.goto('/remote-reservations?court='+court+'&date='+date+'&time=08%3A00&duration=60');
  await page.getByLabel('Nombre del equipo conectado').fill('Equipo conectado');
  return {creates:()=>creates,cancels:()=>cancels};
}
test.describe('Bloqueos autenticados con API simulada',()=>{
  test.skip(process.env.AUTH_E2E!=='1','Requiere configuración de prueba.');
  test('crea con precio final, persiste historial y cancela',async({page},info)=>{
    const calls=await fixture(page);
    await page.getByRole('button',{name:'Crear bloqueo de 10 minutos'}).click();
    await expect(page.getByText(/Total final del servidor:.*95.000/)).toBeVisible();
    await expect(page.getByRole('button',{name:'Cancelar bloqueo'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Crear bloqueo de 10 minutos'})).toHaveCount(0);
    await page.getByText('Resultado comprobado').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('remote-hold.png'),fullPage:true});
    await page.reload();
    await expect(page.getByRole('button',{name:'Cancelar bloqueo'})).toBeVisible();
    await page.getByRole('button',{name:'Cancelar bloqueo'}).click();
    await expect(page.getByText('Cancelada',{exact:true}).first()).toBeVisible();
    expect(calls.creates()).toBe(1);expect(calls.cancels()).toBe(1);
  });
  test('recupera respuesta perdida tras recargar sin segunda creación',async({page})=>{
    const calls=await fixture(page,{lostCreate:true});
    await page.getByRole('button',{name:'Crear bloqueo de 10 minutos'}).click();
    await expect(page.getByRole('alert')).toContainText('No pudimos comprobar');
    await page.reload();
    await page.getByRole('button',{name:'Comprobar o reintentar solicitud'}).click();
    await expect(page.getByText(/Total final del servidor:/)).toBeVisible();
    expect(calls.creates()).toBe(1);
  });
  test('conflicto no se muestra como reserva y permite elegir otro horario',async({page})=>{
    await fixture(page,{conflict:true});
    await page.getByRole('button',{name:'Crear bloqueo de 10 minutos'}).click();
    await expect(page.getByRole('alert')).toContainText('Otro jugador ocupó');
    await expect(page.getByText('Resultado comprobado')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Comprobar o reintentar solicitud'})).toHaveCount(0);
  });
  test('cancelación con respuesta perdida se recupera al consultar',async({page})=>{
    const calls=await fixture(page,{lostCancel:true});
    await page.getByRole('button',{name:'Crear bloqueo de 10 minutos'}).click();
    await page.getByRole('button',{name:'Cancelar bloqueo'}).click();
    await expect(page.getByText('Cancelada',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Cancelar bloqueo'})).toHaveCount(0);
    expect(calls.cancels()).toBe(1);
  });
  test('plazo agotado nunca se presenta como bloqueo vigente',async({page})=>{
    await fixture(page,{expired:true});
    await page.getByRole('button',{name:'Crear bloqueo de 10 minutos'}).click();
    await expect(page.getByText(/Plazo agotado/).first()).toBeVisible();
    await expect(page.getByRole('button',{name:'Cancelar bloqueo'})).toBeDisabled();
  });
  test('al cerrar sesión desaparecen los datos conectados',async({page})=>{
    await fixture(page);
    await page.getByRole('button',{name:'Crear bloqueo de 10 minutos'}).click();
    await expect(page.getByText(/Total final del servidor:/)).toBeVisible();
    await page.goto('/profile');await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
    await page.goto('/remote-reservations');
    await expect(page.getByText('Inicia sesión para continuar')).toBeVisible();
    await expect(page.getByText('Equipo conectado')).toHaveCount(0);
  });
});
