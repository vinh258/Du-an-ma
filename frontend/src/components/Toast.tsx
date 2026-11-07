import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type Kind = 'success' | 'error' | 'info';
interface Item { id: number; kind: Kind; text: string }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 4500);
  }, []);
  const color: Record<Kind, string> = {
    success: 'border-brand bg-surface', error: 'border-danger bg-danger-soft', info: 'border-amber bg-amber-soft',
  };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`pointer-events-auto rounded-md border-l-4 px-4 py-3 text-sm shadow-md ${color[i.kind]}`}>{i.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
