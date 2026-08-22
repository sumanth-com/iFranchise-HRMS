"use client";

import { useEffect, useState } from "react";

/** True after the component has mounted on the client (avoids SSR/portal races). */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
