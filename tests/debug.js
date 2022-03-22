
// Go to https://www.baidu.com/
await page.to('https://www.baidu.com/');

// Go to https://devexpress.github.io/testcafe/example/
await page.to('https://devexpress.github.io/testcafe/example/');

// Click [data-testid="name-input"]
await dom.click('[data-testid="name-input"]');

// Fill [data-testid="name-input"]
await dom.fill('[data-testid="name-input"]','123213');

// Check [data-testid="remote-testing-checkbox"]
await locator('[data-testid="remote-testing-checkbox"]').check();

// Check [data-testid="reusing-js-code-checkbox"]
await locator('[data-testid="reusing-js-code-checkbox"]').check();

// Click text=Running tests in background and/or in parallel in multiple browsers
await dom.click('text=Running tests in background and/or in parallel in multiple browsers');

// Click text=I have tried TestCafe
await dom.click('text=I have tried TestCafe');

await page.screenshot("test-1.jpg")
// Click span
await dom.click('span');

await page.screenshot("test-2.jpg")
// Click text=MacOS
await asyncReport('sd')