import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

  // Go to https://www.baidu.com/
  await page.goto('https://www.baidu.com/');

  // Go to http://ybfw-t.jd.com/ownerAccount/serviceProder/list
  await page.goto('http://ybfw-t.jd.com/ownerAccount/serviceProder/list');

  // Go to http://test.ssa.jd.com/sso/login?ReturnUrl=http%3A%2F%2Fybfw-t.jd.com%2FownerAccount%2FserviceProder%2Flist
  await page.goto('http://test.ssa.jd.com/sso/login?ReturnUrl=http%3A%2F%2Fybfw-t.jd.com%2FownerAccount%2FserviceProder%2Flist');

  // Click [placeholder="ERP账号"]
  await page.locator('[placeholder="ERP账号"]').click();

  // Fill [placeholder="ERP账号"]
  await page.locator('[placeholder="ERP账号"]').fill('zhouyan100');

  // Click [placeholder="密码"]
  await page.locator('[placeholder="密码"]').click();

  // Fill [placeholder="密码"]
  await page.locator('[placeholder="密码"]').fill('xinxibu456');

  // Click text=登 录
  await Promise.all([
    page.waitForNavigation(/*{ url: 'http://ybfw-t.jd.com/ownerAccount/serviceProder/list' }*/),
    page.locator('text=登 录').click()
  ]);

  // Click button:has-text("新 增")
  await page.locator('button:has-text("新 增")').click();

  // Click [placeholder="请选择计费规则类别"]
  await page.locator('[placeholder="请选择计费规则类别"]').click();

  // Click li:has-text("中小件佣金")
  await page.locator('li:has-text("中小件佣金")').click();

  // Click text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品ID"]
  await page.locator('text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品ID"]').click();

  // Fill text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品ID"]
  await page.locator('text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品ID"]').fill('223');

  // Click text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品名称"]
  await page.locator('text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品名称"]').click();

  // Fill text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品名称"]
  await page.locator('text=计费规则类别 产品ID产品名称客户ID客户名称 计算方式单件金额和浮动比例固定比例固定金额 >> [placeholder="请输入产品名称"]').fill('33');

  // Click [placeholder="起始时间"]
  await page.locator('[placeholder="起始时间"]').click();

  // Click span:has-text("21")
  await page.locator('span:has-text("21")').click();

  // Click [placeholder="结束时间"]
  await page.locator('[placeholder="结束时间"]').click();

  // Click span:has-text("31") >> nth=1
  await page.locator('span:has-text("31")').nth(1).click();

});