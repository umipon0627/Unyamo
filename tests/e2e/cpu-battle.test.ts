import { test, expect } from '@playwright/test'

test.describe('/play モード選択画面', () => {
  test('未ログインで /play にアクセスするとログインページへリダイレクト', async ({ page }) => {
    await page.goto('/play')
    await expect(page).toHaveURL(/login/)
  })

  test('ゲストログイン後 /play に遷移して2つのボタンが表示される', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    // 2つの選択カードが表示される
    await expect(page.getByText('CPUと対戦する')).toBeVisible()
    await expect(page.getByText('友達と対戦する')).toBeVisible()
  })

  test('ログイン後トップページにアクセスすると /play にリダイレクト', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    // トップページへ
    await page.goto('/')
    await expect(page).toHaveURL(/play/, { timeout: 5_000 })
  })
})

test.describe('/play/cpu CPUセットアップ画面', () => {
  test('「CPUと対戦する」から /play/cpu に遷移してUIが表示される', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    await page.getByText('CPUと対戦する').click()
    await expect(page).toHaveURL(/\/play\/cpu/, { timeout: 5_000 })

    // セットアップUIが表示される
    await expect(page.getByText('CPU対戦セットアップ')).toBeVisible()
    await expect(page.getByText('CPU人数')).toBeVisible()
    await expect(page.getByText('難易度')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ゲーム開始' })).toBeVisible()
    await expect(page.getByRole('button', { name: '戻る' })).toBeVisible()
  })

  test('「戻る」ボタンで /play に戻る', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    await page.goto('/play/cpu')
    await expect(page.getByRole('button', { name: '戻る' })).toBeVisible()
    await page.getByRole('button', { name: '戻る' }).click()
    await expect(page).toHaveURL(/\/play$/, { timeout: 5_000 })
  })

  test('CPU人数とDifficulty選択UIが動作する', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    await page.goto('/play/cpu')
    await expect(page.getByText('CPU対戦セットアップ')).toBeVisible()

    // CPU人数: 2体を選択
    await page.getByRole('button', { name: '2体' }).click()
    // 難易度: EASYを選択
    await page.getByRole('button', { name: /EASY/ }).click()

    // 選択反映（スタイル変化 — CSSクラスでアクティブ確認）
    const easyBtn = page.getByRole('button', { name: /EASY/ })
    await expect(easyBtn).toHaveClass(/bg-emerald-600/)
  })
})

test.describe('CPU対戦ゲームフロー', () => {
  test('ゲスト認証 → /play/cpu → ゲーム開始 → /room/cpu-... に遷移する', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    await page.goto('/play/cpu')
    await expect(page.getByRole('button', { name: 'ゲーム開始' })).toBeVisible()

    await page.getByRole('button', { name: 'ゲーム開始' }).click()

    // /room/cpu-... に遷移する
    await expect(page).toHaveURL(/\/room\/cpu-/, { timeout: 15_000 })
  })

  test('CPU対戦でゲームが自動進行して結果画面が表示される', async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    await page.goto('/play/cpu')

    // CPU 3体 EASY で高速進行を期待
    await page.getByRole('button', { name: '3体' }).click()
    await page.getByRole('button', { name: /EASY/ }).click()
    await page.getByRole('button', { name: 'ゲーム開始' }).click()

    await expect(page).toHaveURL(/\/room\/cpu-/, { timeout: 15_000 })

    // ゲームが自動進行してウニャモ宣言 or 結果モーダルが表示されるのを待つ
    // 結果画面のタイトル「勝利！」または「ゲーム終了」が表示されるまで最大60秒待機
    await expect(page.getByText(/勝利！|ゲーム終了/)).toBeVisible({ timeout: 60_000 })
  })

  test('結果画面で「終了する」ボタンが /play に遷移する', async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto('/login')
    await page.getByText('ゲストとして参加').click()
    await expect(page).toHaveURL(/play/, { timeout: 10_000 })

    await page.goto('/play/cpu')
    await page.getByRole('button', { name: '3体' }).click()
    await page.getByRole('button', { name: /EASY/ }).click()
    await page.getByRole('button', { name: 'ゲーム開始' }).click()

    await expect(page).toHaveURL(/\/room\/cpu-/, { timeout: 15_000 })
    await expect(page.getByText(/勝利！|ゲーム終了/)).toBeVisible({ timeout: 60_000 })

    // ResultModal の「終了する」ボタンで /play に戻る
    await page.getByRole('button', { name: '終了する' }).click()

    await expect(page).toHaveURL(/\/play$/, { timeout: 10_000 })
  })
})
