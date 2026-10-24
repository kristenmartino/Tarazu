import { defineConfig } from '@playwright/test';

// Manual release-media capture against the deployed app. Fresh guest storage;
// no signed-in account, production workspace mutation or provider calls.
export default defineConfig({
  testDir:'./e2e', testMatch:'product-hunt-readiness.spec.js', grep:/launch gallery/,
  workers:1, fullyParallel:false, timeout:180000, retries:0, reporter:'list',
  use:{baseURL:process.env.LAUNCH_BASE_URL || 'https://tarazu.app',headless:true,trace:'retain-on-failure'},
});
