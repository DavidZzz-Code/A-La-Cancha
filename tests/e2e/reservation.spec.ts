import { test,expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  // UTC ya cambió de día; en Cartagena sigue siendo 3 de noviembre.
  await page.clock.setFixedTime(new Date('2026-11-04T00:30:00Z'));
});

test('precio y hora estables, doble intento bloqueado, cancelación libera turno',async ({page},testInfo) => {
  const errors:string[] = []; page.on('pageerror',error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Menos chats.',{exact:false})).toBeVisible();
  await expect(page.getByText('DEMOSTRACIÓN · Canchas ficticias.',{exact:false}).filter({visible:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('explore.png'),fullPage:true});
  // Turno tardío de hoy: en UTC ya es 4, pero debe seguir mostrándose el 3.
  const detail = '/court/el-patio?date=2026-11-03&time=22%3A00&duration=60';
  await page.goto(detail);
  await expect(page.getByTestId('court-total')).toContainText('120.000');
  await page.getByRole('button',{name:'Armar mi partido',exact:true}).click();
  await expect(page.getByText(/3.*nov.*22:00/).filter({visible:true})).toBeVisible();
  await page.getByRole('textbox',{name:'Nombre del equipo'}).fill('Los de Cartagena');
  await page.getByRole('checkbox',{name:'Entiendo que es una reserva de prueba'}).click();
  await page.getByRole('button',{name:'Crear reserva de prueba',exact:true}).click();
  await expect(page.getByText('Reserva de prueba guardada',{exact:true})).toBeVisible();
  await expect(page.getByTestId('confirmation-total')).toContainText('120.000');
  await expect(page.getByText(/3.*nov.*22:00/).filter({visible:true})).toBeVisible();
  await expect(page.getByText('DEMOSTRACIÓN · Canchas ficticias.',{exact:false}).filter({visible:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('confirmation.png'),fullPage:true});
  // Espera la escritura observando persistencia tras recarga, sin retardos arbitrarios.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('alacancha:demo:v1'))).toContain('Los de Cartagena');
  await page.goto('/booking/el-patio?date=2026-11-03&time=22%3A00&duration=60');
  await expect(page.getByText('Volvamos a elegir el turno',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Mis reservas',exact:true}).click();
  await page.getByRole('button',{name:'Cancelar prueba',exact:true}).click();
  await page.getByRole('button',{name:'Sí, cancelar prueba',exact:true}).click();
  await expect(page.getByText('Falta el primer silbato',{exact:true})).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('alacancha:demo:v1'))).toContain('cancelled');
  await page.goto(detail);
  await expect(page.getByRole('button',{name:'Armar mi partido',exact:true})).toBeEnabled();
  expect(errors).toEqual([]);
});

test('favoritos persisten y filtros muestran resultados o recuperación',async ({page},testInfo) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Guardar El Patio en favoritos'}).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('alacancha:demo:v1'))).toContain('el-patio');
  await page.reload();
  await page.getByRole('link',{name:'Favoritos',exact:true}).click();
  await expect(page.getByRole('button',{name:'Ver El Patio',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Explorar',exact:true}).click();
  await page.getByRole('button',{name:'20:00',exact:true}).click();
  await expect(page.getByText('Probemos otro turno',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cualquier hora',exact:true}).click();
  await page.getByRole('button',{name:'Pádel',exact:true}).click();
  await expect(page.getByRole('button',{name:'Ver Punto y Partido',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Ver El Patio',exact:true})).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('filtered.png'),fullPage:true});
});
