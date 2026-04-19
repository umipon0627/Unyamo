import { test, expect } from '@playwright/test'

// E2Eテスト: 実際のOAuth認証が必要なため、開発環境では手動実行
// CI環境: シークレット設定後にpnpx playwright test で実行

test.describe('Unyamo Game Flow', () => {
  test.skip('ランディングページが表示される', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page.getByText('Unyamo')).toBeVisible()
    await expect(page.getByText('ログインして遊ぶ')).toBeVisible()
  })

  test.skip('未ログインでロビーにアクセスするとログインページへリダイレクト', async ({ page }) => {
    await page.goto('http://localhost:3000/lobby')
    await expect(page).toHaveURL(/login/)
  })

  test.skip('ログインページにGoogle/GitHubボタンが表示される', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await expect(page.getByText('Google でログイン')).toBeVisible()
    await expect(page.getByText('GitHub でログイン')).toBeVisible()
  })

  // 以下のテストはOAuth認証が必要なため手動実行
  test.skip('ルーム作成からゲーム開始まで', async ({ page }) => {
    // 1. ログイン（セッションCookieを事前設定する必要あり）
    // 2. ロビーでルーム作成
    await page.goto('http://localhost:3000/lobby')
    await page.getByText('ルームを作成').click()
    // 3. ルーム名入力
    await page.fill('input[id="roomName"]', 'テストルーム')
    await page.getByText('作成して入室').click()
    // 4. ゲームルームに遷移
    await expect(page).toHaveURL(/\/room\//)
  })
})
