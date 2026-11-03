import { test, expect } from '@playwright/test';
const court={id:'20000000-0000-0000-0000-000000000001',name:'Cancha conectada de prueba',capacity:10,open_minute:420,close_minute:600,venues:{name:'Sede de prueba',city:'Cartagena',published:true}};
test.describe('Agenda remota con API simulada',()=>{
  test.skip(process.env.AUTH_E2E!=='1','Requiere configuración de prueba.');
  test('consulta ocupación y precio de servidor sin crear reserva',async({page})=>{
    let writes=0;
    await page.route('https://auth-test.supabase.co/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith('/courts'))return route.fulfill({json:[court]});
      if(url.pathname.endsWith('/occupied_slots')){const body=route.request().postDataJSON();return route.fulfill({json:[{starts_at:body.p_date+'T07:00:00-05:00',ends_at:body.p_date+'T08:00:00-05:00'}]});}
      if(url.pathname.endsWith('/quote_slot'))return route.fulfill({json:[{base_price:100000,discount:10000,total:90000,deposit:27000,balance:63000}]});
      writes++;return route.abort();
    });
    await page.goto('/remote-agenda');
    await page.getByRole('button',{name:/Cancha conectada de prueba/}).click();
    await expect(page.getByRole('button',{name:'08:00',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'07:00',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'08:00',exact:true}).click();
    await expect(page.getByText(/Precio del servidor:/)).toContainText('90.000');
    await page.getByRole('button',{name:'90 min',exact:true}).click();
    await expect(page.getByText(/Precio del servidor:/)).toHaveCount(0);
    expect(writes).toBe(0);
  });
  test('catálogo vacío no se rellena con canchas demo',async({page})=>{
    await page.route('https://auth-test.supabase.co/**',route=>route.fulfill({json:[]}));
    await page.goto('/remote-agenda');
    await expect(page.getByText('Aún no hay canchas publicadas')).toBeVisible();
    await expect(page.getByText('El Patio',{exact:true})).toHaveCount(0);
  });
  test('fallo de ocupación no presenta horarios libres',async({page})=>{
    await page.route('https://auth-test.supabase.co/**',route=>route.request().url().includes('/courts?')?route.fulfill({json:[court]}):route.fulfill({status:503,json:{message:'unavailable'}}));
    await page.goto('/remote-agenda');await page.getByRole('button',{name:/Cancha conectada de prueba/}).click();
    await expect(page.getByRole('alert')).toContainText('No asumiremos que están libres');
    await expect(page.getByRole('button',{name:'08:00',exact:true})).toHaveCount(0);
  });
});
