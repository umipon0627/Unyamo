import { test, expect } from '@playwright/test'

test.describe('ランディング・ログインページ', () => {
  test('ランディングページが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Unyam' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'はじめる' })).toBeVisible()
  })

  test('未ログインでロビーにアクセスするとログインページへリダイレクト', async ({ page }) => {
    await page.goto('/lobby')
    await expect(page).toHaveURL(/login/)
  })

  test('ログインページにGoogle/GitHubボタンとゲストボタンが表示される', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Google で続ける')).toBeVisible()
    await expect(page.getByText('GitHub で続ける')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ゲストで開始' })).toBeVisible()
  })
})

test.describe('ゲストフロー', () => {
  test('ゲストで開始するとロビーに遷移する', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'ゲストで開始' }).click()
    await expect(page).toHaveURL(/lobby/, { timeout: 10_000 })
    await expect(page.getByText('ゲストモード')).toBeVisible()
  })

  test('ゲストでロビー → ルーム作成ダイアログが開く', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'ゲストで開始' }).click()
    await expect(page).toHaveURL(/lobby/, { timeout: 10_000 })
    await page.getByRole('button', { name: 'ルームを作成' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('ゲストでルーム作成からゲームルームへ遷移', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'ゲストで開始' }).click()
    await expect(page).toHaveURL(/lobby/, { timeout: 10_000 })

    await page.getByRole('button', { name: 'ルームを作成' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.fill('input[id="roomName"]', 'E2Eテストルーム')
    await page.getByRole('button', { name: '作成して入室' }).click()

    await expect(page).toHaveURL(/\/room\//, { timeout: 10_000 })
  })
})

// OAuthを必要とするテストは手動実行
test.describe('OAuth認証フロー', () => {
  test.skip('Google OAuth ログイン後にロビーへ遷移', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('Google で続ける').click()
    // OAuth リダイレクト先は外部なので手動確認
    await expect(page).toHaveURL(/accounts\.google\.com/)
  })
})
