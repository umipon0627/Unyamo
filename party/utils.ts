/**
 * HTMLエスケープ（XSS対策）。
 * ルーム名・プレイヤー名などユーザー入力文字列をクライアントに送る前に必ず通す。
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
