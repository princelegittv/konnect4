import { expect, test } from "@playwright/test";

function createIdentity(prefix) {
  const token = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    username: token.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18),
    email: `${token}@example.com`,
    password: "Konnect4Test123!",
  };
}

async function acceptCookies(page) {
  const acceptButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

async function signup(page, identity) {
  await page.goto("/");
  await acceptCookies(page);
  await page.getByLabel("Username").fill(identity.username);
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Password").fill(identity.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByRole("heading", { name: /play konnect4 your way/i })).toBeVisible();
}

async function login(page, identity) {
  await page.goto("/");
  await acceptCookies(page);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.getByLabel("Email or username").fill(identity.email);
  await page.getByLabel("Password").fill(identity.password);
  await page.locator("form").getByRole("button", { name: /^log in$/i }).click();
  await expect(page.getByRole("heading", { name: /play konnect4 your way/i })).toBeVisible();
}

async function expectRoomScreen(page, headingPattern) {
  await expect(page.getByRole("heading", { name: headingPattern })).toBeVisible();
  await expect(page.locator(".room-code-banner.compact strong")).toBeVisible();
  await expect(page.getByRole("heading", { name: /game status/i })).toBeVisible();
}

async function goToSection(page, label) {
  const directButton = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
  if (await directButton.isVisible().catch(() => false)) {
    await directButton.click();
    return;
  }

  const menuButton = page.getByRole("button", { name: /toggle navigation menu/i });
  await menuButton.click();
  await page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).click();
}

test("users can sign up and create or join a private room", async ({ browser }) => {
  const creator = await browser.newContext();
  const joiner = await browser.newContext();
  const creatorPage = await creator.newPage();
  const joinerPage = await joiner.newPage();

  const creatorIdentity = createIdentity("creator");
  const joinerIdentity = createIdentity("joiner");

  await signup(creatorPage, creatorIdentity);
  await signup(joinerPage, joinerIdentity);

  await creatorPage.getByRole("button", { name: /create private room/i }).click();
  await expectRoomScreen(creatorPage, /private match/i);

  const roomCode = (await creatorPage.locator(".room-code-banner.compact strong").textContent())?.trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);

  await joinerPage.getByLabel("Room code").fill(roomCode);
  await joinerPage.getByRole("button", { name: /join private room/i }).click();

  await expectRoomScreen(joinerPage, /private match/i);
  await expect(creatorPage.locator(".status-banner strong")).toContainText(/your turn|turn|waiting/i);
  await expect(joinerPage.locator(".status-banner strong")).toContainText(/your turn|turn|waiting/i);

  await creator.close();
  await joiner.close();
});

test("random matchmaking pairs two players into the same match", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const firstIdentity = createIdentity("randoma");
  const secondIdentity = createIdentity("randomb");

  await signup(firstPage, firstIdentity);
  await signup(secondPage, secondIdentity);

  await firstPage.getByRole("button", { name: /^play$/i }).click();
  await secondPage.getByRole("button", { name: /^play$/i }).click();

  await firstPage.getByRole("button", { name: /random match/i }).click();
  await secondPage.getByRole("button", { name: /random match/i }).click();

  await firstPage.getByRole("button", { name: /find random match/i }).click();
  await secondPage.getByRole("button", { name: /find random match/i }).click();

  await expectRoomScreen(firstPage, /random match/i);
  await expectRoomScreen(secondPage, /random match/i);

  const firstRoomCode = (await firstPage.locator(".room-code-banner.compact strong").textContent())?.trim();
  const secondRoomCode = (await secondPage.locator(".room-code-banner.compact strong").textContent())?.trim();
  expect(firstRoomCode).toBeTruthy();
  expect(firstRoomCode).toBe(secondRoomCode);

  await expect(firstPage.locator(".player-chip")).toContainText([firstIdentity.username, secondIdentity.username]);
  await expect(secondPage.locator(".player-chip")).toContainText([firstIdentity.username, secondIdentity.username]);

  await firstContext.close();
  await secondContext.close();
});

test("users can log out and log back in", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const identity = createIdentity("loginflow");

  await signup(page, identity);
  await page.getByRole("button", { name: /log out/i }).click();

  await expect(page.getByRole("heading", { name: /^konnect4$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /create account|working/i })).toBeVisible();

  await login(page, identity);
  await expect(page.locator(".profile-bar").getByRole("heading", { name: identity.username })).toBeVisible();

  await context.close();
});

test("ranked matchmaking pairs two players into the same ranked room", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const firstIdentity = createIdentity("rankeda");
  const secondIdentity = createIdentity("rankedb");

  await signup(firstPage, firstIdentity);
  await signup(secondPage, secondIdentity);

  await goToSection(firstPage, "Ranked");
  await goToSection(secondPage, "Ranked");

  await firstPage.getByRole("button", { name: /queue for ranked/i }).click();
  await secondPage.getByRole("button", { name: /queue for ranked/i }).click();

  await expectRoomScreen(firstPage, /ranked match/i);
  await expectRoomScreen(secondPage, /ranked match/i);

  const firstRoomCode = (await firstPage.locator(".room-code-banner.compact strong").textContent())?.trim();
  const secondRoomCode = (await secondPage.locator(".room-code-banner.compact strong").textContent())?.trim();
  expect(firstRoomCode).toBeTruthy();
  expect(firstRoomCode).toBe(secondRoomCode);

  await expect(firstPage.locator(".player-chip")).toContainText([firstIdentity.username, secondIdentity.username]);
  await expect(secondPage.locator(".player-chip")).toContainText([firstIdentity.username, secondIdentity.username]);

  await firstContext.close();
  await secondContext.close();
});

test("mobile layout shows the hamburger menu and opens profile navigation", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const identity = createIdentity("mobile");

  await signup(page, identity);

  const hamburger = page.getByRole("button", { name: /toggle navigation menu/i });
  await expect(hamburger).toBeVisible();
  await hamburger.click();

  await expect(page.getByRole("heading", { name: /menu/i })).toBeVisible();
  await page.getByRole("button", { name: /^profile$/i }).click();
  await expect(page.getByText(/avatar settings/i)).toBeVisible();

  await context.close();
});
