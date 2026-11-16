"use client";

// Mounted only by a temporary localhost test route, never shipped as an app page.
import { useCallback, useRef, useState } from "react";
import { useCachedModalDetail } from "@/lib/ui/use-cached-modal-detail";

type Detail = { id: string; version: number };
export default function ModalDetailFixture() {
  const [id, setId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [, rerender] = useState(0);
  const calls = useRef<Record<string, number>>({});
  const waiting = useRef(new Map<string, { resolve: (value: Detail | null) => void; reject: (error: Error) => void }>());
  const fetchDetail = useCallback((target: string) => {
    const version = calls.current[target] = (calls.current[target] ?? 0) + 1;
    return new Promise<Detail | null>((resolve, reject) => {
      waiting.current.set(`${target}${version}`, { resolve, reject });
    });
  }, []);
  const { detail, loading, error, refresh, invalidate } = useCachedModalDetail({ id, open, fetchDetail });
  return <main>
    <h1>Modal detail fixture</h1>
    <output>{JSON.stringify({ id, open, detail, loading, error, calls: calls.current })}</output>
    {['A', 'B'].map((value) => <button key={value} onClick={() => { setId(value); setOpen(true); }}>Open {value}</button>)}
    <button onClick={() => setOpen(false)}>Close fixture</button>
    <button onClick={() => rerender((value) => value + 1)}>Rerender fixture</button>
    <button onClick={() => { invalidate(); void refresh(); }}>Refresh fixture</button>
    {['A', 'B'].flatMap((value) => [1, 2].map((version) => <button key={`${value}${version}`} onClick={() => waiting.current.get(`${value}${version}`)?.resolve({ id: value, version })}>Resolve {value}{version}</button>))}
    <button onClick={() => waiting.current.get('A1')?.reject(new Error('Fixture failure'))}>Reject A1</button>
  </main>;
}
