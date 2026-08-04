import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ colorScheme: "dark" });
const BASE = process.argv[2];
await p.goto(`${BASE}/signup`);
await p.getByTestId("signup-name").fill("Dbg");
await p.getByTestId("signup-email").fill(`anc-${Date.now()}@example.com`);
await p.getByTestId("signup-password").fill("hunter2-password");
await p.getByTestId("signup-submit").click();
await p.waitForSelector('[data-testid="app-shell"]');
await p.getByTestId("account-row").click();
await p.getByTestId("theme-toggle").click();
await p.waitForTimeout(200);
const out = await p.evaluate(() => {
  const chain = [];
  let el = document.querySelector('[data-testid="nav-home"]');
  while (el) {
    chain.push({
      tag: el.tagName + (el.dataset?.testid ? `[${el.dataset.testid}]` : ""),
      color: getComputedStyle(el).color,
      cls: (el.className || "").toString().slice(0, 60),
    });
    el = el.parentElement;
  }
  return { base: location.origin, htmlClass: document.documentElement.className, chain };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
