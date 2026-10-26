import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useGateImage } from './useGateImage';
const GateContext = createContext<ReturnType<typeof useGateImage> | null>(null);
export function GateProvider({ children }: { children: ReactNode }) { const library = useGateImage(); return <GateContext.Provider value={library}>{children}</GateContext.Provider>; }
// Context and provider belong together; the hook is used only by consumers.
// eslint-disable-next-line react-refresh/only-export-components
export function useGateLibrary() { const value = useContext(GateContext); if (!value) throw new Error('Gate library provider is missing.'); return value; }
