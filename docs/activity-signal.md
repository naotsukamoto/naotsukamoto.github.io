# Activity Signal 運用メモ

サイトは `data/activity.json` のランニング集計値のみをブラウザから読みます。APIトークンやOAuth情報はHTML・CSS・ブラウザJavaScriptへ置きません。

## データ更新

- COROS: 公式COROS MCPからランニング記録を取得し、毎日午前3時（日本時間）に週・月・年の距離と当月回数を更新します。
- 公開するのは集計値だけです。活動ID、位置情報、心拍、OAuthトークンなどは `data/activity.json` に保存しません。
- OAuthトークンはAES-256-GCMで暗号化してリポジトリに保持し、復号鍵だけをGitHub Actionsの `COROS_TOKEN_KEY` Secretに保存します。

## COROS自動更新

GitHub Actionsの `.github/workflows/sync-coros.yml` が `0 18 * * *`（UTC）で動作します。これは日本時間の午前3時です。GitHubの混雑状況により、開始時刻が数分程度遅れる場合があります。

処理順は次のとおりです。

1. GitHub Secretの暗号鍵でOAuthトークンを一時領域へ復号する。
2. COROS公式MCPから当年のランニング記録を読み取る。
3. `data/activity.json` の `running` 集計だけを更新する。
4. 更新されたOAuthトークンを再暗号化する。
5. 検証後、集計JSONと暗号化トークンだけをコミットする。

週の目標距離は現在 `70 km` として表示用進捗を計算しています。変更する場合は `data/activity.json` の `weekTargetKm` を更新します。
