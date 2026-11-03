import { test, expect } from '@playwright/test';

test.describe('Cuenta de desarrollo con API simulada', () => {
  test.skip(process.env.AUTH_E2E !== '1', 'Requiere exportación con configuración de prueba.');
  test('rechaza credenciales, restaura sesión y cierra sin conservar contraseña', async ({ page }) => {
    const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'player@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 }) + '.test-signature';
    let attempts = 0;
    await page.route('https://auth-test.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/token')) {
        attempts++;
        if (attempts === 1) return route.fulfill({ status: 400, json: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } });
        return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, user } });
      }
      if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 });
      if (url.pathname.endsWith('/user')) return route.fulfill({ json: user });
      return route.abort();
    });
    await page.goto('/profile');
    await page.getByLabel('Correo de la cuenta').fill(user.email);
    await page.getByLabel('Contraseña de la cuenta').fill('test-password-only');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('No pudimos iniciar sesión');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByText('Sesión iniciada: '+user.email)).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(window.sessionStorage))).not.toContain('test-password-only');
    await page.reload();
    await expect(page.getByText('Sesión iniciada: '+user.email)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    await expect(page.getByLabel('Contraseña de la cuenta')).toHaveValue('');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
  });
  test('un fallo de red permite reintentar sin bloquear el formulario', async ({ page }) => {
    await page.route('https://auth-test.supabase.co/**', route => route.abort('connectionrefused'));
    await page.goto('/profile');
    await page.getByLabel('Correo de la cuenta').fill('player@example.test');
    await page.getByLabel('Contraseña de la cuenta').fill('test-password-only');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('No pudimos');
    await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeEnabled();
  });
});
