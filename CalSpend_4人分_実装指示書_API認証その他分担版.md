# CalSpend 4人分 実装指示書
## 役割分担：①Google Calendar API連携 ②認証 ③Firestore・出費データ ④UI・集計・画面

---

# 0. 共通仕様

## アプリ名
CalSpend（仮）

## コンセプト
「予定を書く感覚で、出費も残す。」

Google Calendarを出費入力の入口として利用し、大学生が本格的な家計簿をつけなくても、細かな出費を簡単に記録・確認できるWebアプリを作る。

## 技術スタック

- Next.js（App Router）
- TypeScript
- Firebase Authentication
- Cloud Firestore
- Google Calendar API
- Tailwind CSS
- npm
- Git / GitHub

## MVP要件

1. Googleアカウントでログインできる
2. Firebase Authenticationを利用する
3. Firestoreにユーザーごとの出費を保存する
4. 管理アプリから出費を追加できる
5. Google Calendarの「出費」イベントから出費を読み込める
6. 1つのGoogle Calendarイベントに複数の出費を書ける
7. 日・週・月ごとの出費を確認できる
8. 月間カレンダーで出費額TOP3の日にマークを付ける

---

# 1. Git・ブランチ共通ルール

## ブランチ構成

```text
main
└─ develop
   ├─ feature/01-google-calendar
   ├─ feature/02-auth
   ├─ feature/03-expense-data
   └─ feature/04-ui-dashboard
```

各担当は `develop` から自分のブランチを作る。

```bash
git checkout develop
git pull origin develop
git checkout -b feature/XX-name
```

作業中：

```bash
git add .
git commit -m "feat: ○○を実装"
git push origin feature/XX-name
```

Pull Request：

```text
feature/XX-name
↓
develop
```

最終：

```text
develop
↓
main
```

直接 `main` へpushしない。

---

# 2. コミットルール

```text
feat: 新機能
fix: バグ修正
refactor: 内部整理
style: UI変更
docs: 文書変更
chore: 設定変更
```

例：

```text
feat: Google Calendar同期を実装
feat: 出費追加フォームを実装
fix: 週集計の日付境界を修正
```

---

# 3. 共通データ型

`src/types/expense.ts`

```ts
export type ExpenseSource = "manual" | "google-calendar";

export interface Expense {
  id: string;
  name: string;
  amount: number;
  spentAt: Date;
  source: ExpenseSource;
  googleEventId?: string;
  itemIndex?: number;
}

export interface NewExpenseInput {
  name: string;
  amount: number;
  spentAt: Date;
}

export interface CalendarExpenseInput extends NewExpenseInput {
  googleEventId: string;
  itemIndex: number;
}
```

この型は全担当で共通利用する。

担当者の判断だけで型名やフィールド名を変更しない。

---

# 4. Firestore構造

```text
users
└─ {uid}
   └─ expenses
      ├─ {expenseId}
      └─ ...
```

Firestore document：

```ts
{
  name: string,
  amount: number,
  spentAt: Timestamp,
  source: "manual" | "google-calendar",
  googleEventId?: string,
  itemIndex?: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

Google Calendar由来のデータは重複防止のため：

```text
gcal_{googleEventId}_{itemIndex}
```

というDocument IDを利用する。

---

# 5. Google Calendar入力仕様

Google Calendar上の対象イベント：

```text
タイトル:
出費
```

説明欄：

```text
昼食 850
コーヒー 180
電車 230
```

最低限、以下の表記を認識する。

```text
昼食 850
昼食 850円
昼食 ¥850
昼食：850
昼食,850
```

1行につき1件の出費として扱う。

---

# 6. 画面URL

```text
/login
  Googleログイン

/
  ダッシュボード

/expenses/new
  出費手動入力

/settings
  Google Calendar同期
```

---

# 7. 推奨ディレクトリ構成

```text
src/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ login/
│  │  └─ page.tsx
│  ├─ expenses/
│  │  └─ new/
│  │     └─ page.tsx
│  └─ settings/
│     └─ page.tsx
│
├─ components/
│  ├─ auth/
│  ├─ expenses/
│  ├─ dashboard/
│  └─ calendar/
│
├─ contexts/
│  └─ AuthContext.tsx
│
├─ lib/
│  ├─ firebase.ts
│  ├─ expenses.ts
│  └─ google-calendar.ts
│
└─ types/
   └─ expense.ts
```

---

# 担当① Google Calendar API連携

## 役割

Google Calendar APIから「出費」イベントを取得し、1イベント内に記載された複数の出費を解析して、担当③が用意するFirestore保存関数へ渡す。

## ブランチ

```text
feature/01-google-calendar
```

## 主に編集するファイル

```text
src/lib/google-calendar.ts
src/components/calendar/*
src/app/settings/page.tsx
```

他担当の所有ファイルは原則変更しない。

---

## 利用する他担当の機能

担当②の認証：

```ts
const {
  user,
  googleAccessToken
} = useAuth();
```

担当③のFirestore関数：

```ts
upsertCalendarExpense(...)
```

を利用する。

担当①からFirestoreへ直接 `addDoc()` や `setDoc()` を書かない。

---

## Calendar API

Google Calendar API REST endpoint：

```text
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
```

Authorization：

```text
Authorization: Bearer {googleAccessToken}
```

query parameter：

```text
timeMin
timeMax
singleEvents=true
orderBy=startTime
```

---

## 最小限のGoogle Calendar Event型

```ts
interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
}
```

---

## 対象イベント

MVPでは完全一致。

```ts
event.summary === "出費"
```

のイベントのみ処理する。

---

## 出費解析関数

`src/lib/google-calendar.ts`

```ts
export interface ParsedExpense {
  name: string;
  amount: number;
}

export function parseExpenseDescription(
  description: string
): ParsedExpense[];
```

例：

入力：

```text
昼食 850
コーヒー 180
電車 230
```

出力：

```ts
[
  { name: "昼食", amount: 850 },
  { name: "コーヒー", amount: 180 },
  { name: "電車", amount: 230 }
]
```

---

## 対応する入力形式

```text
昼食 850
昼食 850円
昼食 ¥850
昼食：850
昼食,850
```

以下は無視する。

```text
メモのみ
金額なし
0円以下
```

---

## イベント日時

`event.start.dateTime` が存在する場合：

```ts
new Date(event.start.dateTime)
```

を利用。

終日イベントの場合：

```text
event.start.date
```

を利用。

---

## Firestoreへの保存

解析した各出費について：

```ts
await upsertCalendarExpense(
  uid,
  {
    name,
    amount,
    spentAt,
    googleEventId: event.id,
    itemIndex
  }
);
```

を呼ぶ。

---

## 必須同期関数

```ts
export async function importExpensesFromGoogleCalendar(
  uid: string,
  accessToken: string,
  start: Date,
  end: Date
): Promise<number>;
```

処理：

```text
Calendar APIへアクセス
↓
期間内イベント取得
↓
summary === "出費" のみ
↓
descriptionを解析
↓
複数Expenseへ変換
↓
upsertCalendarExpense()
↓
取り込み件数を返す
```

---

## `/settings` 画面

最低限：

```text
Google Calendar連携

接続状態：
接続済み / 未接続

同期対象：
2026年9月

[ Google Calendarと同期 ]

結果：
3件取り込みました
```

Access Tokenがない場合：

```text
Google Calendarへのアクセス権がありません。
Googleで再ログインしてください。
```

---

## エラー処理

最低限：

- Access Tokenなし
- HTTP 401
- HTTP 403
- ネットワークエラー
- descriptionなし
- 不正な金額
- Calendar APIレスポンス異常

アプリ全体をクラッシュさせず、画面にメッセージを表示する。

---

## 担当①の完了条件

- [ ] Google Calendar APIからイベント取得
- [ ] 「出費」イベントのみ抽出
- [ ] 1イベント内の複数出費を解析
- [ ] 指定した5種類の入力形式に対応
- [ ] 担当③のupsert関数を利用
- [ ] 同じイベントを再同期しても重複しない
- [ ] `/settings` から同期できる
- [ ] 取り込み件数を表示
- [ ] TypeScriptエラーなし
- [ ] `npm run build` 成功

---

## AIへの指示文

この担当では、CalSpendのGoogle Calendar API連携を実装してください。

必須条件：

1. Next.js App Router
2. TypeScript
3. Google Calendar REST API
4. 認証は担当②の `useAuth()` を使用
5. Firestore保存は担当③の `upsertCalendarExpense()` を使用
6. 共通Expense型を変更しない
7. 他担当の所有ファイルを原則変更しない
8. 同期処理は冪等にする
9. 最後に「作成・変更ファイル一覧」と「動作確認方法」を出力する

---

# 担当② Firebase認証・Googleログイン

## 役割

Firebase Authenticationを利用したGoogleログイン・ログアウト・ユーザー状態管理と、Google Calendar APIで利用するAccess Token取得を担当する。

## ブランチ

```text
feature/02-auth
```

## 主に編集するファイル

```text
src/lib/firebase.ts
src/contexts/AuthContext.tsx
src/components/auth/*
src/app/login/page.tsx
src/app/layout.tsx
.env.local.example
```

---

## Firebase初期化

`src/lib/firebase.ts`

以下をexport：

```ts
export const app
export const auth
export const db
```

Firebase Modular SDKを利用。

Firebase Appの多重初期化を防ぐ。

---

## 環境変数

`.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

`.env.local` はGitへcommitしない。

代わりに `.env.local.example` を用意する。

---

## Google Provider

```ts
const provider = new GoogleAuthProvider();
```

Calendar API用scope：

```ts
provider.addScope(
  "https://www.googleapis.com/auth/calendar.events"
);
```

MVPでCalendarイベントを読むために必要なscopeを設定する。

---

## Googleログイン

```ts
const result =
  await signInWithPopup(auth, provider);

const credential =
  GoogleAuthProvider.credentialFromResult(result);

const accessToken =
  credential?.accessToken ?? null;
```

---

## AuthContext

`src/contexts/AuthContext.tsx`

公開インターフェース：

```ts
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}
```

必ず：

```ts
export function useAuth()
```

を公開。

他担当は：

```ts
const {
  user,
  loading,
  googleAccessToken
} = useAuth();
```

で利用する。

---

## 認証状態

Firebaseログイン状態は：

```ts
onAuthStateChanged()
```

等で監視する。

---

## Google Access Tokenについて

Firebaseのログイン状態とGoogle Calendar API用Access Tokenは別。

MVPでは：

```text
Access Token
↓
AuthContextのメモリに保持
```

でよい。

ページ再読込等でTokenが失われた場合：

```text
Google Calendarを利用するには再度Googleログインしてください。
```

と表示できればよい。

Refresh Tokenの本格管理はMVPでは行わない。

---

## `/login`

UI：

```text
CalSpend

予定を書く感覚で、出費も残す。

[ Googleでログイン ]
```

ログイン済みなら：

```text
/
```

へ移動。

---

## `layout.tsx`

アプリ全体：

```tsx
<AuthProvider>
  {children}
</AuthProvider>
```

---

## エラー処理

- popupを閉じた
- Firebase設定不足
- Googleログイン失敗
- Access Token取得失敗

---

## 担当②の完了条件

- [ ] Firebase初期化
- [ ] Googleログイン成功
- [ ] Firebase Authenticationにユーザー登録
- [ ] `useAuth().user` 取得
- [ ] Google Access Token取得
- [ ] ログアウト成功
- [ ] `/login` 動作
- [ ] TypeScriptエラーなし
- [ ] `npm run build` 成功

---

## AIへの指示文

この担当ではFirebase AuthenticationとGoogleログインを実装してください。

必須条件：

1. Next.js App Router
2. TypeScript
3. Firebase Modular SDK
4. Client Componentが必要なファイルには `"use client"`
5. Google Calendar API用scopeを追加
6. AuthContextの公開関数名を変更しない
7. 他担当の所有ファイルを原則変更しない
8. 最後に「作成・変更ファイル一覧」と「動作確認方法」を出力する

---

# 担当③ Firestore・出費データ管理

## 役割

CalSpendのデータ層を担当する。

主な責務：

- Firestoreへの手動出費保存
- Google Calendar由来出費のupsert
- 出費削除
- 出費の期間取得
- Firestore TimestampとDate変換
- Google Calendar再同期時の重複防止

UIは原則担当④が担当する。

## ブランチ

```text
feature/03-expense-data
```

## 主に編集するファイル

```text
src/lib/expenses.ts
src/types/expense.ts
```

`src/types/expense.ts` は共通仕様どおり初期作成し、以後勝手に変更しない。

必要であれば：

```text
src/lib/firestore-utils.ts
```

等を担当ディレクトリとして追加してよい。

---

## Firestore保存先

```text
users/{uid}/expenses/{expenseId}
```

---

## 必須関数1：手動登録

```ts
export async function addExpense(
  uid: string,
  input: NewExpenseInput
): Promise<string>;
```

保存内容：

```ts
{
  name,
  amount,
  spentAt,
  source: "manual",
  createdAt,
  updatedAt
}
```

戻り値：

```text
作成したDocument ID
```

---

## 必須関数2：Calendar用upsert

```ts
export async function upsertCalendarExpense(
  uid: string,
  input: CalendarExpenseInput
): Promise<void>;
```

Document ID：

```text
gcal_{googleEventId}_{itemIndex}
```

例：

```text
gcal_abc123_0
gcal_abc123_1
```

保存：

```ts
setDoc(
  ref,
  data,
  { merge: true }
);
```

これにより、同じCalendarイベントを再同期しても件数が増えないようにする。

---

## 必須関数3：削除

```ts
export async function deleteExpense(
  uid: string,
  expenseId: string
): Promise<void>;
```

---

## 必須関数4：期間購読

```ts
export function subscribeExpenses(
  uid: string,
  start: Date,
  end: Date,
  callback: (expenses: Expense[]) => void
): () => void;
```

Firestore：

```ts
onSnapshot()
```

を利用する。

条件：

```text
spentAt >= start
spentAt <= end
```

取得したTimestampは：

```ts
timestamp.toDate()
```

等でJavaScript Dateに変換。

---

## Firestore Rules案

```text
match /users/{userId}/{document=**} {
  allow read, write:
    if request.auth != null
    && request.auth.uid == userId;
}
```

Firebase ConsoleでのRules設定はチーム全体で確認する。

---

## エラー処理

- uid空
- 不正なamount
- Firestore write失敗
- Firestore read失敗
- Timestamp変換失敗

---

## 担当③が他担当へ提供するAPI

担当①：

```ts
upsertCalendarExpense()
```

担当④：

```ts
addExpense()
deleteExpense()
subscribeExpenses()
```

を利用する。

関数名を勝手に変更しない。

---

## 担当③の完了条件

- [ ] 手動出費保存
- [ ] Calendar出費upsert
- [ ] 同期重複防止
- [ ] 出費削除
- [ ] 期間指定で出費取得
- [ ] Timestamp→Date変換
- [ ] ユーザー単位でデータ分離
- [ ] TypeScriptエラーなし
- [ ] `npm run build` 成功

---

## AIへの指示文

この担当ではCloud Firestoreを用いた出費データ管理層を実装してください。

必須条件：

1. TypeScript
2. Firebase Modular SDK
3. `users/{uid}/expenses/{expenseId}` を使用
4. 共通Expense型に従う
5. 指定されたexport関数名を変更しない
6. Google Calendar用upsertを冪等にする
7. UIは実装しない
8. 他担当の所有ファイルを原則変更しない
9. 最後に「作成・変更ファイル一覧」と「動作確認方法」を出力する

---

# 担当④ UI・ダッシュボード・手動入力・集計

## 役割

利用者が操作する画面部分を担当する。

主な責務：

- ダッシュボード
- 月間出費合計
- 日・週・月表示切替
- 月間カレンダー
- 出費額TOP3日のマーク
- 最近の出費一覧
- 手動出費入力画面
- スマートフォン向けレスポンシブUI

Firestoreへの直接処理は作らず、担当③の関数を利用する。

## ブランチ

```text
feature/04-ui-dashboard
```

## 主に編集するファイル

```text
src/app/page.tsx
src/app/expenses/new/page.tsx

src/components/dashboard/*
src/components/expenses/*
```

必要であれば：

```text
src/components/common/*
```

等を追加してよい。

---

## 認証

担当②：

```ts
const {
  user,
  loading
} = useAuth();
```

を利用。

未ログイン：

```text
/login
```

へ誘導。

---

## 出費取得

担当③：

```ts
subscribeExpenses(
  uid,
  start,
  end,
  callback
)
```

を使用する。

Firestoreへ直接queryを書かない。

---

## 手動登録

担当③：

```ts
addExpense(
  uid,
  {
    name,
    amount,
    spentAt
  }
)
```

を使用。

---

## `/expenses/new`

画面：

```text
出費を追加

日付
[ 2026/09/08 ]

名称
[ 昼食 ]

金額
[ 850 ] 円

[ 登録する ]
```

---

## バリデーション

- 名称空欄不可
- amount <= 0 不可
- 金額が数値以外不可
- 登録中はボタンdisabled
- 未ログイン時は登録不可

登録成功：

```text
登録しました
```

可能なら：

```text
/
```

へ戻る。

---

## `/` ダッシュボード

イメージ：

```text
CalSpend                         ⚙

2026年9月

今月の出費
¥24,680

[ 日 ] [ 週 ] [ 月 ]

────────────────

月間カレンダー

月 火 水 木 金 土 日
   1  2  3  4  5  6
 7 🔴8  9 10 11 12 13
14 15 16 🔴17 18 19 20
21 22 23 24 25 26 27
28 29 30

────────────────

最近の出費

9/8  昼食           ¥850
9/8  コーヒー       ¥180

[ ＋ 出費を追加 ]

[ Google Calendar ]
```

Google Calendarボタン：

```text
/settings
```

へリンク。

---

## 集計用純粋関数

担当④のディレクトリ内：

```ts
export function sumExpenses(
  expenses: Expense[]
): number;

export function groupExpensesByDay(
  expenses: Expense[]
): Record<string, number>;

export function getTopExpenseDays(
  expenses: Expense[],
  count?: number
): string[];
```

Firestoreに依存させない。

---

## 日・週・月切替

### 日

選択日だけ。

### 週

選択日を含む月曜日〜日曜日。

### 月

選択月1日〜月末。

---

## 出費が多い日

MVP定義：

```text
その月の日別出費合計TOP3
```

TOP3の日に：

```text
赤いdot
```

または：

```text
🔴
```

を表示。

---

## 月間カレンダー

日別合計を表示してもよい。

例：

```text
🔴8
¥5,230
```

日付クリックで、その日の出費一覧を表示できれば望ましい。

---

## データなし

```text
まだ出費がありません。
出費を登録してみましょう。
```

を表示。

---

## レスポンシブ

最低限：

```text
375px
```

のスマートフォン幅で崩れない。

PC：

```text
max-w-5xl
```

程度で中央寄せ。

---

## 担当④の完了条件

- [ ] `/` 表示
- [ ] `/expenses/new` 表示
- [ ] Firestoreデータを画面表示
- [ ] 手動出費追加
- [ ] 月合計表示
- [ ] 日・週・月切替
- [ ] 月間カレンダー
- [ ] TOP3日マーク
- [ ] 最近の出費一覧
- [ ] `/settings` へのリンク
- [ ] 375px幅で崩れない
- [ ] TypeScriptエラーなし
- [ ] `npm run build` 成功

---

## AIへの指示文

この担当ではCalSpendのUI・ダッシュボード・出費入力・集計機能を実装してください。

必須条件：

1. Next.js App Router
2. TypeScript
3. Tailwind CSS
4. 認証は担当②の `useAuth()` を利用
5. Firestoreアクセスは担当③の関数を利用
6. Firestoreへ直接query/writeを新規実装しない
7. 共通Expense型を変更しない
8. UIはスマホ優先
9. 他担当の所有ファイルを原則変更しない
10. 最後に「作成・変更ファイル一覧」と「動作確認方法」を出力する

---

# 8. 担当間の依存関係

```text
             担当② 認証
          user / accessToken
             ↓       ↓
             ↓       └──────────────┐
             ↓                      │
担当④ UI・集計                  担当① Calendar API
     ↓                              ↓
     └──────→ 担当③ Firestore ←────┘
```

具体的には：

## 担当② → 担当①

```ts
googleAccessToken
user
```

## 担当② → 担当④

```ts
user
loading
```

## 担当③ → 担当①

```ts
upsertCalendarExpense()
```

## 担当③ → 担当④

```ts
addExpense()
deleteExpense()
subscribeExpenses()
```

---

# 9. 推奨する開発順

4人同時並行で進めてよい。

最初に全員で以下だけ確認する。

```text
共通Expense型
Firestore構造
URL
関数名
ブランチ名
```

その後：

```text
担当① Calendar解析・API
担当② Firebase認証
担当③ Firestoreデータ層
担当④ UI
```

を並行実装。

---

# 10. 推奨マージ順

依存関係上：

```text
1. 担当② 認証
2. 担当③ Firestore
3. 担当④ UI
4. 担当① Google Calendar
```

が安全。

担当①は担当③の `upsertCalendarExpense()` を使うため、最終統合では担当③を先に入れる。

---

# 11. 最終統合

各担当はPR前に：

```bash
git fetch origin
git merge origin/develop
npm install
npm run lint
npm run build
```

統合後：

```bash
git checkout develop
git pull origin develop

npm install
npm run lint
npm run build
npm run dev
```

---

# 12. 最終統合テスト

## テスト1：認証

```text
/login
↓
Googleログイン
↓
Dashboard
```

---

## テスト2：手動出費

```text
昼食
850円
```

登録。

Firestoreに保存。

Dashboard：

```text
+850円
```

---

## テスト3：Google Calendar

Calendar：

```text
タイトル:
出費

説明:
コーヒー 180
電車 230
```

同期。

Firestore：

```text
2件追加
```

Dashboard：

```text
+410円
```

---

## テスト4：重複防止

同じCalendarイベントをもう一度同期。

```text
Firestoreの件数が増えない
```

---

## テスト5：月間カレンダー

日別出費合計TOP3の日に：

```text
🔴
```

が表示される。

---

# 13. 最終デモシナリオ

1. Googleログイン
2. CalSpend Dashboard表示
3. 「出費を追加」
4. 昼食850円を登録
5. Dashboardへ反映
6. Google Calendarを開く
7. 「出費」イベントを作成
8. 説明欄に複数件を書く

```text
コーヒー 180
電車 230
昼食 850
```

9. CalSpendの「Google Calendarと同期」
10. 3件を一括取り込み
11. 月合計が更新
12. 高出費日TOP3のマークを見せる

---

# 14. MVPでは実装しないもの

2daysでの完成を優先し、以下は後回し。

- 銀行口座連携
- クレジットカード連携
- レシートOCR
- AIカテゴリ分類
- 高度な予算管理
- Google Calendarへの逆同期
- Push通知
- 複数ユーザー共有
- Refresh Tokenの本格管理
