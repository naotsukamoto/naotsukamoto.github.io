# Activity Signal 運用メモ

サイトは `coros-data` ブランチの `data/activity.json` を GitHub の raw URL から読みます。取得失敗・5秒のタイムアウト・不正なデータの場合はサイト同梱の `data/activity.json` に戻り、「保存済みの記録」と表示します。APIトークンやOAuth情報はHTML・CSS・ブラウザJavaScriptへ置きません。

## データ更新

- COROS: 公式COROS MCPからランニング記録を取得し、毎日午前3時（日本時間）に週・月・年の距離と当月回数を更新します。
- 公開するのは集計値だけです。活動ID、位置情報、心拍、OAuthトークンなどは `data/activity.json` に保存しません。
- OAuthトークンはAES-256-GCMで暗号化してリポジトリに保持し、復号鍵だけをGitHub Actionsの `COROS_TOKEN_KEY` Secretに保存します。

## COROS自動更新

GitHub Actionsの `.github/workflows/sync-coros.yml` が `0 18 * * *`（UTC）で動作します。これは日本時間の午前3時です。GitHubの混雑状況により、開始時刻が数分程度遅れる場合があります。

処理順は次のとおりです。

1. `coros-data` ブランチから前回の集計JSONと暗号化トークンを取得する。初回は `master` の既存ファイルから独立したブランチを作る。
2. GitHub Secretの暗号鍵でOAuthトークンを一時領域へ復号する。
3. COROS公式MCPから当年のランニング記録を読み取る。
4. `data/activity.json` の `running` 集計だけを更新する。
5. 更新されたOAuthトークンを再暗号化する。
6. `coros-data` にのみコミットする。検証に失敗した集計値は保存せず、更新された暗号化トークンは保持する。

`master` は自動更新しないため、COROS更新を理由とする開発PCでのpullは不要です。ローカルの集計JSONは公開時点の予備データとして残ります。専用ブランチには集計JSONと暗号化トークンだけを保存し、復号鍵は引き続きGitHub Secretに置きます。

導入時はこの変更を `master` にpushし、Actionsの「Sync COROS running signal」を手動実行してください。初回成功後、`coros-data` ブランチとサイトの最新記録表示を確認します。GitHub Pagesの公開元は変更不要です。ワークフローは `master` からの実行に限定し、トークン更新途中で中断しないよう同時実行を直列化します。

`coros-data` の暗号化トークンが運用中の最新版です。`master` 側の古いトークンへ戻すと同期できなくなる場合があるため、旧ワークフローへ戻す際は最新版を引き継いでください。

週の目標距離は現在 `70 km` として表示用進捗を計算しています。変更する場合は `data/activity.json` の `weekTargetKm` を更新します。
