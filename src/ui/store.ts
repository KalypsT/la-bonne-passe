import { create } from 'zustand';

export type Ecran = 'titre';

interface EtatInterface {
  ecran: Ecran;
  allerA: (ecran: Ecran) => void;
}

export const useInterface = create<EtatInterface>((set) => ({
  ecran: 'titre',
  allerA: (ecran) => set({ ecran }),
}));
