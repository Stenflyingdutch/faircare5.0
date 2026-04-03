import { create } from 'zustand';
import type { IndividualResult, SharedResult } from '@/types/results';

interface ResultsStore {
  individualResult: IndividualResult | null;
  sharedResult: SharedResult | null;
  setIndividualResult: (value: IndividualResult | null) => void;
  setSharedResult: (value: SharedResult | null) => void;
}

export const useResultsStore = create<ResultsStore>((set) => ({
  individualResult: null,
  sharedResult: null,
  setIndividualResult: (value) => set({ individualResult: value }),
  setSharedResult: (value) => set({ sharedResult: value }),
}));
