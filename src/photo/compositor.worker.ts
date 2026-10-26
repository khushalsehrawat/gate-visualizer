import { compositePhoto } from './composite';
import type { CompositeRequest } from './model';
const scope = self as unknown as { onmessage: ((event: MessageEvent<CompositeRequest>) => void) | null; postMessage: (data: unknown, transfer?: Transferable[]) => void };
scope.onmessage = (event) => {
  try { const pixels = compositePhoto(event.data); scope.postMessage({ ok: true, pixels }, [pixels.buffer]); }
  catch (reason) { scope.postMessage({ ok: false, message: reason instanceof Error ? reason.message : 'Photo composition failed.' }); }
};
