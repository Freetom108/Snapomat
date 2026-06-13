import { useCallback, useEffect, useState } from 'react';
import {
  getExpenses,
  saveBudget as persistBudget,
  getBudget,
  deleteExpense as removeExpenseFromStorage,
} from '../store/storage';

export function useBudget() {
  const [budget, setBudgetState] = useState(1000);
  const [expenses, setExpenses] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [storedBudget, storedExpenses] = await Promise.all([getBudget(), getExpenses()]);
    setBudgetState(storedBudget);
    setExpenses(storedExpenses);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setBudget = useCallback(async (amount) => {
    setBudgetState(amount);
    await persistBudget(amount);
  }, []);

  const removeExpense = useCallback(async (id) => {
    await removeExpenseFromStorage(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const spent = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const remaining = budget - spent;

  return {
    budget,
    expenses,
    spent,
    remaining,
    setBudget,
    removeExpense,
    refresh,
    ready,
  };
}
