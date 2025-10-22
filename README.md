# トランザクション練習アプリ

このアプリは、Node.js（Express）と MySQL を使った簡単な送金システムです。  
ユーザー登録・ログイン・送金処理（トランザクション管理）を学ぶことができます。

---

## 主な機能

- ユーザー登録（ユーザー名・パスワード・所持金）
- ログイン認証（bcrypt によるパスワードハッシュ化）
- ログイン後、送金フォームから他ユーザーへ送金
- 送金はトランザクションで安全に処理
- エラー時はフラッシュメッセージで通知

---

## セットアップ

### 🔧 ローカル環境での実行

1. `TRANSACTION` ディレクトリに移動します。
2. `.env` ファイルを作成し、以下の環境変数を設定します：

   ```env
   MYSQL_ROOT_PASSWORD=A
   SECRET_KEY=B
   DB_HOST=localhost
   DB_USER=C
   DB_PASSWORD=D
   DB_NAME=money
   ```

3. MySQL をローカルにインストールします。
4. `init.sql` の内容を MySQL に実行し、初期データベースを作成します。
5. 依存パッケージをインストールします：

   ```bash
   npm install
   ```

6. アプリを起動します：

   ```bash
   nodemon app.ts
   ```

7. ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。

---

### 🐳 Docker 環境での実行

1. Docker をインストールします。
2. `.env` ファイルを作成し、以下の環境変数を設定します：

   ```env
   MYSQL_ROOT_PASSWORD=A
   SECRET_KEY=B
   DB_HOST=db
   DB_USER=C
   DB_PASSWORD=D
   DB_NAME=money
   ```

3. 以下のコマンドでコンテナをビルド＆起動します：

   ```bash
   docker-compose up --build
   ```

4. ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。

---

### 💡 補足

- `.env` の `DB_HOST` は、**ローカル実行時は `localhost`、Docker 実行時は `db`** に設定してください。
- Docker 環境では、初回起動時に `init.sql` によりデータベースが自動で初期化されます。
