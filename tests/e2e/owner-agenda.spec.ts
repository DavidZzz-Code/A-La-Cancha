import { test, expect, type Page } from '@playwright/test';
const actor = '00000000-0000-0000-0000-000000000003';
const venue = '10000000-0000-0000-0000-000000000001';
const court = '20000000-0000-0000-0000-000000000001';
const second = '20000000-0000-0000-0000-000000000002';
async function fixture(page: Page, options: { confirm?: boolean; noAccess?: boolean; failure?: boolean; truncated?: boolean; presencial?: 'retry' | 'conflict' } = {}) {
  let booking: Record<string, unknown> | undefined;
  let confirmed = false, revoked = false, reads = 0, writes = 0;
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const user = { id: actor, email: 'owner@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
  const access_token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: actor, exp: Math.floor(Date.now()/1000)+3600 }) + '.fixture';
  await page.route('https://auth-test.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { user, access_token, refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer' } });
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 });
    if (options.confirm && url.pathname.endsWith('/transition_reservation')) {
      expect(route.request().postDataJSON()).toEqual({p_id:'30000000-0000-0000-0000-000000000001',p_status:'confirmed'});
      confirmed = true;
      writes++;
      return route.fulfill({json:{id:'30000000-0000-0000-0000-000000000001',kind:'player',status:'confirmed'}});
    }
    if (options.presencial && url.pathname.endsWith('/create_reservation')) {
      writes++;
      const data = route.request().postDataJSON();
      expect(data).toMatchObject({p_kind:'external',p_court:court,p_duration:60,p_time:'08:00',p_players:6,p_team:'Equipo visitante'});
      if (options.presencial === 'conflict') return route.fulfill({status:409,json:{code:'23P01'}});
      if (booking) {
        expect(data.p_key).toBe(booking.idempotency_key);
        return route.fulfill({json:booking});
      }
      booking = { id:'30000000-0000-0000-0000-000000000004', kind:'external', status:'confirmed',
        actor_id:actor, court_id:court, team:data.p_team, players:data.p_players, idempotency_key:data.p_key,
        starts_at:data.p_date+'T08:00:00-05:00',ends_at:data.p_date+'T09:00:00-05:00',expires_at:null,
        total:100000,discount:0,deposit:30000,balance:70000 };
      return route.abort('connectionreset');
    }
    if (route.request().method() !== 'GET') { writes++; return route.abort(); }
    const respond = (json: unknown[], count = json.length) => route.fulfill({ json, headers: { 'content-range': `${json.length ? '0-'+(json.length-1) : '*'}/${count}`, 'access-control-expose-headers': 'content-range' } });
    if (url.pathname.endsWith('/venue_members')) {
      expect(url.searchParams.get('user_id')).toBe('eq.'+actor);
      return respond(revoked || options.noAccess ? [] : [{ venue_id: venue, user_id: actor }]);
    }
    if (url.pathname.endsWith('/courts')) {
      expect(url.searchParams.get('venue_id')).toBe('in.('+venue+')');
      return respond([court, second].map((id,i) => ({ id, venue_id: venue, name: 'Cancha '+(i+1), open_minute:420, close_minute:600, published:i===0, venues:{ name:'Sede DEMO', published:true } })));
    }
    if (url.pathname.endsWith('/reservations')) {
      reads++;
      expect(url.searchParams.get('select')).not.toMatch(/actor_id|idempotency_key/);
      expect(url.searchParams.get('ends_at')).toMatch(/^gt\.\d{4}-\d\d-\d\dT05:00:00.000Z$/);
      expect(url.searchParams.get('starts_at')).toMatch(/^lt\.\d{4}-\d\d-\d\dT05:00:00.000Z$/);
      if (options.failure) return route.fulfill({status:503,json:{message:'unavailable'}});
      if (url.searchParams.get('court_id')==='eq.'+second) return respond([]);
      expect(url.searchParams.get('court_id')).toBe('eq.'+court);
      const date = url.searchParams.get('ends_at')!.slice(3,13);
      const base = {court_id:court,starts_at:date+'T07:00:00-05:00',ends_at:date+'T08:00:00-05:00',expires_at:null,team:'Equipo de la app',players:10};
      return respond([
        {...base,id:'30000000-0000-0000-0000-000000000001',kind:'player',status:confirmed?'confirmed':'held',expires_at:options.confirm?new Date(Date.now()+600000).toISOString():'2020-01-01T00:00:00Z'},
        {...base,id:'30000000-0000-0000-0000-000000000002',kind:'external',status:'cancelled',team:'Registro anterior'},
        {...base,id:'30000000-0000-0000-0000-000000000003',kind:'block',status:'confirmed',team:'Mantenimiento',starts_at:date+'T09:00:00-05:00',ends_at:date+'T09:30:00-05:00'},
        ...(booking && String(booking.starts_at).startsWith(date) ? [booking] : []),
      ], options.truncated ? 201 : undefined);
    }
    return route.abort();
  });
  await page.goto('/profile');
  await page.getByLabel('Correo de la cuenta').fill(user.email);
  await page.getByLabel('Contraseña de la cuenta').fill('fixture-password');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page.getByText('Sesión iniciada: '+user.email)).toBeVisible();
  await page.getByRole('button',{name:'Agenda de mi establecimiento'}).click();
  return { revoke: () => { revoked=true; }, reads: () => reads, writes: () => writes };
}
test.describe('Agenda del propietario con API simulada', () => {
  test.skip(process.env.AUTH_E2E !== '1', 'Requiere configuración de prueba.');
  test('confirma un bloqueo vigente desde la agenda', async ({page}) => {
    const api = await fixture(page, {confirm:true});
    await page.getByRole('button',{name:'Mañana',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar reserva del jugador'}).click();
    await expect(page.getByText('Reserva de la app · Confirmada',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Confirmar reserva del jugador'})).toHaveCount(0);
    expect(api.writes()).toBe(1);
  });
  test('consulta por cancha y fecha, distingue estados sin realizar escrituras', async ({page}, info) => {
    const api = await fixture(page);
    await expect(page.getByText('07:00 · Ocupado',{exact:true})).toBeVisible();
    await expect(page.getByText('Reserva de la app · Bloqueo temporal · sin confirmar',{exact:true})).toBeVisible();
    await expect(page.getByText('Registro manual · Cancelada',{exact:true})).toBeVisible();
    await expect(page.getByText('Bloqueo del establecimiento · Confirmada',{exact:true})).toBeVisible();
    await expect(page.getByText(/Plazo agotado; pendiente/)).toBeVisible();
    await page.getByRole('button',{name:'Mañana',exact:true}).click();
    await expect(page.getByText('08:00 · Libre al consultar',{exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath('owner-agenda.png'),fullPage:true});
    await page.getByRole('button',{name:'Sede DEMO · Cancha 2',exact:true}).click();
    await expect(page.getByText('No hay reservas registradas para esta cancha y fecha.')).toBeVisible();
    await expect(page.getByText(/No publicada para jugadores/)).toBeVisible();
    await expect(page.getByText(/Equipo de la app/)).toHaveCount(0);
    expect(api.reads()).toBeGreaterThanOrEqual(3); expect(api.writes()).toBe(0);
  });
  test('sin membresías no consulta reservas ni inventa un establecimiento', async ({page}) => {
    const api=await fixture(page,{noAccess:true});
    await expect(page.getByText('Sin canchas asignadas',{exact:true})).toBeVisible();
    expect(api.reads()).toBe(0);
    await expect(page.getByRole('button',{name:'Registrar turno presencial'})).toHaveCount(0);
  });
  for (const mode of ['retry','conflict'] as const) test('registro presencial: '+mode, async ({page}) => {
    const api = await fixture(page,{presencial:mode});
    await page.getByRole('button',{name:'Mañana',exact:true}).click();
    await page.getByRole('button',{name:'Registrar turno presencial'}).click();
    await page.getByRole('button',{name:'08:00',exact:true}).click();
    await page.getByLabel('Equipo del turno presencial').fill('Equipo visitante');
    await page.getByLabel('Jugadores del turno presencial').fill('6');
    await page.getByRole('button',{name:'Guardar turno presencial'}).click();
    if (mode === 'conflict') {
      await expect(page.getByRole('alert')).toContainText('El turno ya está ocupado');
      await expect(page.getByText('Registro manual · Confirmada')).toHaveCount(0);
    } else {
      await expect(page.getByRole('alert')).toContainText('Resultado pendiente');
      await page.reload();
      await page.getByRole('button',{name:'Mañana',exact:true}).click();
      await page.getByRole('button',{name:'Comprobar turno presencial'}).click();
      await expect(page.getByRole('button',{name:'Registrar turno presencial'})).toBeVisible();
      await expect(page.getByText('Registro manual · Confirmada')).toHaveCount(1);
      await expect(page.getByText('08:00 · Ocupado',{exact:true})).toBeVisible();
      expect(api.writes()).toBe(2);
    }
  });
  for (const option of ['failure','truncated'] as const) test(`agenda ${option} no muestra disponibilidad`, async ({page}) => {
    await fixture(page,{[option]:true});
    await expect(page.getByRole('alert')).toContainText('No mostramos horarios como libres', { timeout: 20000 });
    await expect(page.getByText(/Libre al consultar/)).toHaveCount(0);
    await expect(page.getByText('No hay reservas registradas para esta cancha y fecha.')).toHaveCount(0);
  });
  test('revocar acceso y actualizar retira datos; cerrar sesión protege la ruta', async ({page}) => {
    const api=await fixture(page);
    await expect(page.getByText(/Equipo de la app/)).toBeVisible();
    api.revoke();
    await page.getByRole('button',{name:'Actualizar agenda del establecimiento'}).click();
    await expect(page.getByText('Sin canchas asignadas',{exact:true})).toBeVisible();
    await expect(page.getByText(/Equipo de la app/)).toHaveCount(0);
    await page.goto('/profile');
    await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
    await expect(page.getByRole('button',{name:'Iniciar sesión',exact:true})).toBeVisible();
    await page.goto('/owner-agenda');
    await expect(page.getByRole('button',{name:'Ir a mi cuenta'})).toBeVisible();
    await expect(page.getByText(/Equipo de la app/)).toHaveCount(0);
  });
});
