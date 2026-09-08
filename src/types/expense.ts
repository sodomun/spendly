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