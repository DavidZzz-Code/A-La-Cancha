import { test, expect, type Page } from '@playwright/test';
const actor='00000000-0000-0000-0000-000000000003', court='20000000-0000-0000-0000-000000000001', venue='10000000-0000-0000-0000-000000000001';
async function fixture(page:Page, options:{lostCreate?:boolean;lostCancel?:boolean;conflict?:boolean;denied?:boolean}={}) {
  let row:Record<string,unknown>|null=null, creates=0, cancels=0;
  const date=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const user={id:actor,email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
  const enc=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const token=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:actor,exp:Math.floor(Date.now()/1000)+3600})+'.fixture';
  await page.route('https://auth-test.supabase.co/**',async route=>{
    const url=new URL(route.request().url());
    const single=route.request().headers().accept?.includes('vnd.pgrst.object');
    const respond=(rows:unknown[])=>route.fulfill({json:single?(rows[0]??null):rows,headers:{'content-range':`${rows.length?'0-'+(rows.length-1):'*'}/${rows.length}`,'access-control-expose-headers':'content-range'}});
    if(url.pathname.endsWith('/token'))return route.fulfill({json:{user,access_token:token,refresh_token:'fixture',expires_in:3600,token_type:'bearer'}});
    if(url.pathname.endsWith('/venue_members'))return respond(options.denied?[]:[{venue_id:venue,user_id:actor}]);
    if(url.pathname.endsWith('/courts'))return respond([{id:court,venue_id:venue,name:'Cancha mantenimiento',open_minute:420,close_minute:660,published:true,venues:{name:'DEMO',published:true}}]);
    if(url.pathname.endsWith('/reservations')) {
      if(url.searchParams.has('idempotency_key')) {
        expect(url.searchParams.get('actor_id')).toBe('eq.'+actor);
        return respond(row&&url.searchParams.get('idempotency_key')==='eq.'+row.idempotency_key?[row]:[]);
      }
      expect(url.searchParams.get('court_id')).toBe('eq.'+court);
      if(!url.searchParams.has('id')) expect(url.searchParams.get('kind')).toBe('eq.block');
      return respond(row?[row]:[]);
    }
    if(url.pathname.endsWith('/create_reservation')) {
      creates++; const body=route.request().postDataJSON();
      expect(body.p_kind).toBe('block');expect(body.p_players).toBe(1);expect(body).not.toHaveProperty('p_total');
      if(options.conflict)return route.fulfill({status:409,json:{code:'23P01',message:'conflict'}});
      row={id:'40000000-0000-0000-0000-000000000001',court_id:court,actor_id:actor,idempotency_key:body.p_key,kind:'block',status:'confirmed',starts_at:body.p_date+'T'+body.p_time+':00-05:00',ends_at:body.p_date+'T09:00:00-05:00',team:body.p_team,total:0,discount:0,deposit:0,balance:0,cancellation_reason:null};
      if(options.lostCreate)return route.abort('connectionreset');
      return route.fulfill({json:row});
    }
    if(url.pathname.endsWith('/transition_reservation')) {
      cancels++;const body=route.request().postDataJSON();expect(body.p_status).toBe('cancelled');expect(body.p_reason).toBe('Trabajo reprogramado');
      row={...row,status:'cancelled',cancellation_reason:body.p_reason};
      if(options.lostCancel)return route.abort('connectionreset');
      return route.fulfill({json:row});
    }
    return route.abort();
  });
  await page.goto('/profile');
  await page.getByLabel('Correo de la cuenta').fill(user.email);await page.getByLabel('Contraseña de la cuenta').fill('fixture-password');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page.getByText('Sesión iniciada: '+user.email)).toBeVisible();
  await page.goto(`/owner-maintenance?court=${court}&date=${date}`);
  return {creates:()=>creates,cancels:()=>cancels};
}
async function create(page:Page) {
  await page.getByRole('button',{name:'08:00',exact:true}).click();
  await page.getByLabel('Motivo del mantenimiento',{exact:true}).fill('Reparar iluminación');
  await page.getByRole('button',{name:'Confirmar mantenimiento',exact:true}).click();
}
async function cancel(page:Page) {
  await page.getByRole('button',{name:'Cancelar mantenimiento',exact:true}).click();
  await expect(page.getByRole('button',{name:'Confirmar cancelación del mantenimiento'})).toBeDisabled();
  await page.getByLabel('Motivo de cancelación del mantenimiento').fill('Trabajo reprogramado');
  await page.getByRole('button',{name:'Confirmar cancelación del mantenimiento'}).click();
}
test.describe('Mantenimiento del encargado',()=>{
  test.skip(process.env.AUTH_E2E!=='1','Requiere configuración de prueba.');
  test('crea y cancela con motivo sin cobrar ni duplicar',async({page},info)=>{
    const calls=await fixture(page);await create(page);
    await expect(page.getByText('Mantenimiento activo',{exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath('maintenance.png'),fullPage:true});
    await cancel(page);
    await expect(page.getByText('Mantenimiento cancelado',{exact:true})).toBeVisible();
    await expect(page.getByText('Motivo de cancelación: Trabajo reprogramado')).toBeVisible();
    expect(calls.creates()).toBe(1);expect(calls.cancels()).toBe(1);
  });
  test('respuesta de creación perdida se recupera tras recarga sin otra escritura',async({page})=>{
    const calls=await fixture(page,{lostCreate:true});await create(page);
    await expect(page.getByRole('alert')).toContainText('conservamos la solicitud');
    await page.reload();
    await page.getByRole('button',{name:'Comprobar mantenimiento pendiente'}).click();
    await expect(page.getByText(/Mantenimiento activo · .* · 08:00 · Reparar iluminación/)).toBeVisible();
    expect(calls.creates()).toBe(1);
  });
  test('conflicto permite corregir sin presentar mantenimiento confirmado',async({page})=>{
    await fixture(page,{conflict:true});await create(page);
    await expect(page.getByRole('alert')).toContainText('El horario ya está ocupado');
    await expect(page.getByRole('button',{name:'Confirmar mantenimiento',exact:true})).toBeVisible();
    await expect(page.getByText('Mantenimiento activo',{exact:true})).toHaveCount(0);
  });
  test('cancelación con respuesta perdida se reconoce al consultar',async({page})=>{
    const calls=await fixture(page,{lostCancel:true});await create(page);await cancel(page);
    await expect(page.getByText('Mantenimiento cancelado',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Cancelar mantenimiento',exact:true})).toHaveCount(0);
    expect(calls.cancels()).toBe(1);
  });
  test('sin membresía no ofrece escrituras',async({page})=>{
    const calls=await fixture(page,{denied:true});
    await expect(page.getByText('Sin acceso a esta cancha',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Confirmar mantenimiento',exact:true})).toHaveCount(0);
    expect(calls.creates()).toBe(0);
  });
  test('fallo al persistir referencia impide enviar la creación',async({page})=>{
    await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('alacancha.maintenance-intent.'))throw Error('storage unavailable');return original.call(this,key,value);};});
    const calls=await fixture(page);await create(page);
    await expect(page.getByRole('alert')).toBeVisible();expect(calls.creates()).toBe(0);
  });
});
