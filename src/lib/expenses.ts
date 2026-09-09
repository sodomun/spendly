import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  addDoc,
  Timestamp,
  where,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";

import { db } from "./firebase";
import type {
  CalendarExpenseInput,
  Expense,
  NewExpenseInput,
} from "@/types/expense";

/**
 * 手動で出費を追加する
 */
export async function addExpense(
  uid: string,
  input: NewExpenseInput
): Promise<string> {
  if (!uid) {
    throw new Error("ユーザーIDがありません。");
  }

  if (!input.name.trim()) {
    throw new Error("出費の名称を入力してください。");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("金額は0より大きい数値にしてください。");
  }

  const expensesRef = collection(db, "users", uid, "expenses");

  const now = Timestamp.now();

  const docRef = await addDoc(expensesRef, {
    name: input.name.trim(),
    amount: input.amount,
    spentAt: Timestamp.fromDate(input.spentAt),
    source: "manual",
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

/**
 * Google Calendar由来の出費を保存・更新する
 *
 * Document IDを固定することで、
 * 同じCalendarイベントを何度同期しても重複しない。
 */
export async function upsertCalendarExpense(
  uid: string,
  input: CalendarExpenseInput
): Promise<void> {
  if (!uid) {
    throw new Error("ユーザーIDがありません。");
  }

  if (!input.googleEventId) {
    throw new Error("Google CalendarイベントIDがありません。");
  }

  if (!input.name.trim()) {
    throw new Error("出費の名称を入力してください。");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("金額は0より大きい数値にしてください。");
  }

  if (!Number.isInteger(input.itemIndex) || input.itemIndex < 0) {
    throw new Error("itemIndexが不正です。");
  }

  const expenseId = `gcal_${input.googleEventId}_${input.itemIndex}`;

  const expenseRef = doc(
    db,
    "users",
    uid,
    "expenses",
    expenseId
  );

  const now = Timestamp.now();

  await setDoc(
    expenseRef,
    {
      name: input.name.trim(),
      amount: input.amount,
      spentAt: Timestamp.fromDate(input.spentAt),
      source: "google-calendar",
      googleEventId: input.googleEventId,
      itemIndex: input.itemIndex,
      createdAt: now,
      updatedAt: now,
    },
    {
      merge: true,
    }
  );
}

/**
 * 出費を削除する
 */
export async function deleteExpense(
  uid: string,
  expenseId: string
): Promise<void> {
  if (!uid) {
    throw new Error("ユーザーIDがありません。");
  }

  if (!expenseId) {
    throw new Error("出費IDがありません。");
  }

  const expenseRef = doc(
    db,
    "users",
    uid,
    "expenses",
    expenseId
  );

  await deleteDoc(expenseRef);
}

/**
 * Google Calendar由来の出費をすべて削除する
 */
export async function deleteAllCalendarExpenses(uid: string): Promise<void> {
  if (!uid) throw new Error("ユーザーIDがありません。");

  const expensesRef = collection(db, "users", uid, "expenses");
  const q = query(expensesRef, where("source", "==", "google-calendar"));
  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * 指定期間の出費をリアルタイム購読する
 *
 * 戻り値の関数を呼ぶと購読解除できる。
 */
export function subscribeExpenses(
  uid: string,
  start: Date,
  end: Date,
  callback: (expenses: Expense[]) => void
): () => void {
  if (!uid) {
    throw new Error("ユーザーIDがありません。");
  }

  const expensesRef = collection(
    db,
    "users",
    uid,
    "expenses"
  );

  const q = query(
    expensesRef,
    where("spentAt", ">=", Timestamp.fromDate(start)),
    where("spentAt", "<=", Timestamp.fromDate(end))
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const expenses: Expense[] = snapshot.docs.map((document) => {
        const data = document.data();

        return {
          id: document.id,
          name: data.name,
          amount: data.amount,
          spentAt: data.spentAt.toDate(),
          source: data.source,
          googleEventId: data.googleEventId,
          itemIndex: data.itemIndex,
        };
      });

      callback(expenses);
    },
    (error) => {
      console.error("出費データの取得に失敗しました:", error);
    }
  );
}