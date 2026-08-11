# CLAUDE.md

多言語対応の語学学習アプリ(AIチャットサービス向けのプロンプトを生成し、貼り付けられたJSON回答をlocalStorageに保存する)。ソースコード・デモサイトをそのまま公開する前提のため、APIキーもサーバー側の永続化も持たない。

## 依存方針(必ず守ること)

- **フレームワークを使わない**: Next.js等は導入しない。配信対象(`public/`)は素のHTML/CSS/バニラJSという構成を維持する
- **配信対象と非配信物を分ける**: Vercelに実際にデプロイされる静的ファイル(HTML/CSS/JS/favicon)はすべて`public/`に置く。テスト・設定ファイル・ドキュメント(`test/`, `tsconfig.json`, `package.json`, `CLAUDE.md`, `README.md`, `LICENSE`, `docs/`)はルート直下に置いたまま、`vercel.json`の`outputDirectory: "public"`と`.vercelignore`で配信・アップロード対象から明示的に除外する。ルート直下に新しい非配信ファイルを追加したときは`.vercelignore`への追記を忘れないこと
- **サーバー側API・DBを持たない**: このアプリはAI APIを一切呼び出さず、生成物の保存先もlocalStorageのみ。`/api`ディレクトリやサーバー側の永続化を安易に追加しない(公開デモである以上、課金・秘密情報管理が発生する変更は特に慎重に)
- **ランタイム依存ライブラリはゼロ**
- **TypeScriptは使わない**: `.js` + JSDocで型注釈し、`tsconfig.json`の`checkJs`で型チェックする。`.ts`ファイルは作らない
- **テストは`node:test`のみ**: Jest等は導入しない。localStorageに依存する関数は`storage`引数(既定値`globalThis.localStorage`)を受け取れるようにし、テストでは`test/helpers/fakeStorage.js`の`FakeStorage`を注入する

## ページ初期化はrouter.jsが唯一の呼び出し元(必ず守ること)

`public/js/router.js`はpjax方式の軽量SPAルーターで、ページ固有モジュール(`app.js` / `history.js` / `words.js`)の`init()`を呼ぶ責務を持つ。フルロード時もpjax遷移時も、初期化の呼び出し元は`router.js`の`initPage()`ただ一つに集約する。

- **ページモジュールの末尾で`init()`を呼んではならない**。`init()`はexportするだけにする
- 理由: ページモジュールが自分で`init()`を呼び、かつルーターも`mod.init()`を呼ぶと、**そのセッションで初めてそのモジュールが`import()`されたときだけ**`init()`が2回走る(2回目以降の遷移ではESモジュールがキャッシュ済みで末尾は再実行されない)。結果イベントリスナーが二重登録される

## 学習対象言語でアプリ全体がスコープされる

- 現在の学習対象言語は`public/js/languages.js`の`getCurrentLanguageCode()`/`setCurrentLanguageCode()`でlocalStorageに保存され(キー`linguaNotebook:currentLanguage`)、リロードしても維持される
- 履歴・単語帳のデータはすべて言語コードでキーが分かれている(`linguaNotebook:history:<code>` / `linguaNotebook:words:<code>`)。言語を切り替えると別の言語のデータは一切見えない
- 言語切り替えは`public/js/header.js`の`switchLanguage()`が担い、pjaxでの部分差し替えではなく**ページ全体をフルリロード**する。履歴・単語帳の状態が言語をまたいで丸ごと変わるため、中途半端な部分更新より確実性を優先している

## フィールド名は言語非依存にする(「thai」のような言語名を埋め込まない)

タイ語専用だった前身アプリと異なり、対象言語は10言語から選べる。そのため文章・単語のデータ構造は`thai`のような言語名ではなく`text`という汎用フィールド名を使う(`public/js/historyStore.js`の`SentenceExplanation.text`、`public/js/wordStore.js`の`WordEntry.text`など)。新しいフィールドを追加する際もこの命名方針を踏襲すること。

## 単語帳の設計(単語データはイミュータブル)

`public/js/wordStore.js`の`upsertWord`は、登録(新規)・編集のどちらも内部的には「同じ`text`を持つ既存エントリ(編集ならidで指定した対象も)を削除してから、新しいid・`createdAt`で登録し直す」という同一のロジックに統合されている。同じidのまま内容を書き換える、という一般的な「更新」は行わない。

- **理由**: 学習者は「この単語を前に登録したかどうか」を覚えていないことが多く、それ自体はどうでもよい。むしろ「最近関心を持って登録した単語」として一覧の先頭(登録日時順)に来ることの方が学習体験として重要。そのため重複登録は拒否せず、常に「削除→新規登録」で最新化する
- 単語の`meaning`はUI上非表示(文脈から意味を習得する方針)なので、削除→再登録で古い`meaning`が失われても実質問題にならない

## 一覧の並び順は`createdAt`の同値衝突に注意する(必ず守ること)

`public/js/wordStore.js`の`listWords`・`public/js/historyStore.js`の`listHistory`はどちらも`createdAt`(ミリ秒)の降順で並べるが、単なる`sort((a,b) => b.createdAt - a.createdAt)`は使わない。このアプリはサーバー通信を挟まず同期的に連続登録できるため、同一ミリ秒内に複数件登録されるケースが普通に起きる(実際にテストで再現する)。

- 配列は常に「古い→新しい」の順で末尾に追記される(`[...remaining, entry]` / `[...base, ...saved]`)
- 一覧取得時は**先に配列を反転してから**`createdAt`降順で安定ソートする。こうすることで、`createdAt`が同値の場合は「配列の後ろにあった方(=後から追加された方)」が先に来る
- `saveHistoryEntries`はバッチ内の並び順(プロンプトで提示したテーマ・切り口の順)を保つため、`createdAt`を`now - インデックス`でわずかにずらしてもいる。上記の反転ソートはそれとは別に、バッチ同士(別々の呼び出し)が同一ミリ秒になった場合の保険

## コマンド

```bash
npm test          # node:testでユニットテスト実行
npm run typecheck # tsc --noEmit
npx serve public   # ローカルで静的サイトとして起動(APIは無いのでこれで十分)
```

サーバー側API・環境変数を持たないため、Vercelへのデプロイも`vercel deploy`のみで完結する。ただし配信対象を`public/`に絞るため、`vercel.json`(`outputDirectory: "public"`)と`.vercelignore`(テスト・設定ファイル・ドキュメント類の除外)は設定済みで、これらは変更・削除しないこと。
