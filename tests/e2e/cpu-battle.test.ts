import { test, expect } from '@playwright/test'

/** ゲスト認証 → /lobby 着地 → /play へ移動 */
async function guestToPlay(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'ゲストで開始' }).click()
  await expect(page).toHaveURL(/lobby/, { timeout: 10_000 })
  await page.goto('/play')
  await expect(page).toHaveURL(/\/play$/, { timeout: 5_000 })
}

test.describe('/play モード選択画面', () => {
  test('未ログインで /play にアクセスするとログインページへリダイレクト', async ({ page }) => {
    await page.goto('/play')
    await expect(page).toHaveURL(/login/)
  })

  test('ゲストログイン後 /play に2つの対戦カードが表示される', async ({ page }) => {
    await guestToPlay(page)
    await expect(page.getByText('オンライン対戦')).toBeVisible()
    await expect(page.getByText('CPU対戦')).toBeVisible()
  })

  test('ログイン後トップページにアクセスすると /play にリダイレクト', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'ゲストで開始' }).click()
    await expect(page).toHaveURL(/lobby/, { timeout: 10_000 })
    await page.goto('/')
    await expect(page).toHaveURL(/play/, { timeout: 5_000 })
  })
})

test.describe('/play/cpu CPUセットアップ画面', () => {
  test('「CPU対戦」から /play/cpu に遷移してUIが表示される', async ({ page }) => {
    await guestToPlay(page)
    await page.getByText('CPU対戦').click()
    await expect(page).toHaveURL(/\/play\/cpu/, { timeout: 5_000 })

    await expect(page.getByRole('heading', { name: 'CPU 対戦' })).toBeVisible()
    await expect(page.getByText('人数')).toBeVisible()
    await expect(page.getByText('難易度')).toBeVisible()
    await expect(page.getByRole('button', { name: '対戦スタート' })).toBeVisible()
    await expect(page.getByRole('button', { name: '戻る' })).toBeVisible()
  })

  test('「戻る」ボタンで /play に戻る', async ({ page }) => {
    await guestToPlay(page)
    await page.goto('/play/cpu')
    await expect(page.getByRole('button', { name: '戻る' })).toBeVisible()
    await page.getByRole('button', { name: '戻る' }).click()
    await expect(page).toHaveURL(/\/play$/, { timeout: 5_000 })
  })

  test('CPU人数と難易度の選択UIが動作する', async ({ page }) => {
    await guestToPlay(page)
    await page.goto('/play/cpu')
    await expect(page.getByRole('heading', { name: 'CPU 対戦' })).toBeVisible()

    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: /EASY/ }).click()

    const easyBtn = page.getByRole('button', { name: /EASY/ })
    await expect(easyBtn).toHaveClass(/bg-unyamo-green/)
  })
})

test.describe('CPU対戦ゲームフロー', () => {
  test('ゲスト認証 → /play/cpu → 対戦スタート → /room/cpu-... に遷移する', async ({ page }) => {
    await guestToPlay(page)
    await page.goto('/play/cpu')
    await expect(page.getByRole('button', { name: '対戦スタート' })).toBeVisible()
    await page.getByRole('button', { name: '対戦スタート' }).click()
    await expect(page).toHaveURL(/\/room\/cpu-/, { timeout: 15_000 })
  })

  test('CPU対戦でゲームが自動進行して結果画面が表示される', async ({ page }) => {
    test.setTimeout(90_000)
    await guestToPlay(page)
    await page.goto('/play/cpu')

    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: /EASY/ }).click()
    await page.getByRole('button', { name: '対戦スタート' }).click()

    await expect(page).toHaveURL(/\/room\/cpu-/, { timeout: 15_000 })
    await expect(page.getByText(/Winner —|ゲーム終了/)).toBeVisible({ timeout: 60_000 })
  })

  test('結果画面で「退室」ボタンが /play に遷移する', async ({ page }) => {
    test.setTimeout(90_000)
    await guestToPlay(page)
    await page.goto('/play/cpu')
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: /EASY/ }).click()
    await page.getByRole('button', { name: '対戦スタート' }).click()

    await expect(page).toHaveURL(/\/room\/cpu-/, { timeout: 15_000 })
    await expect(page.getByText(/Winner —|ゲーム終了/)).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: '退室' }).click()
    await expect(page).toHaveURL(/\/play$/, { timeout: 10_000 })
  })
})
