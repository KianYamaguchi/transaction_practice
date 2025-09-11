# トランザクション練習アプリ

このアプリは、Node.js（Express）と MySQL を使った簡単な送金システムです。  
ユーザー登録・ログイン・送金処理（トランザクション管理）を学ぶことができます。

## 主な機能

- ユーザー登録（ユーザー名・パスワード・所持金）
- ログイン認証（bcrypt によるパスワードハッシュ化）
- ログイン後、送金フォームから他ユーザーへ送金
- 送金はトランザクションで安全に処理
- エラー時はフラッシュメッセージで通知

## セットアップ

1. 必要なパッケージをインストール

   ```
   npm install
   ```

2. MySQL でデータベースとテーブルを作成

   ```sql
   CREATE DATABASE money;
   USE money;

   CREATE TABLE users (
     userId INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(50) NOT NULL UNIQUE,
     password VARCHAR(255) NOT NULL,
     money INT NOT NULL
   );
   ```

3. `.env`ファイル（必要なら）や DB 接続情報を編集

## 起動方法

```
npm start
```

または

```
node app.js
```

## 画面構成

- `/register` … ユーザー登録画面
- `/login` … ログイン画面
- `/home` … ログイン後の送金・残高表示画面

## 注意事項

- ローカル開発用のため、セキュリティやバリデーションは最低限です。
- パスワードは bcrypt でハッシュ化しています。
- 送金処理はトランザクションで管理され、失敗時はロールバックされます。
- エラーはフラッシュメッセージで表示されます。
