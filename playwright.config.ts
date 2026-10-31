import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', fullyParallel:true, retries:0, timeout:45000,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure',timezoneId:'America/Bogota'},
  projects:[{name:'mobile-web',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}},{name:'desktop-web',use:{browserName:'chromium',viewport:{width:1440,height:1000}}}],
  webServer:{command:'node scripts/serve-preview.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
});
