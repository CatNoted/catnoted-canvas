import { useEffect, useRef } from "react";
import * as Y from "yjs";
import type { CollabContextValue } from "./types";

export function useCollabDoc(ctx: CollabContextValue) {
  const rootRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!ctx.doc) return;
    rootRef.current = ctx.doc;

    return () => {
      rootRef.current = null;
    };
  }, [ctx.doc]);

  return rootRef.current;
}
