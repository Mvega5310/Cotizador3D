// Cola de una tarea a la vez, dentro del proceso. La usa la generación de
// PDF: cada una abre un Chromium, y varias en paralelo (varios usuarios, o
// uno que toque el botón varias veces) pueden dejar sin memoria el servidor.
// Sirve mientras haya una sola instancia.
let cola: Promise<unknown> = Promise.resolve();

export function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const r = cola.then(tarea, tarea);
  cola = r.catch(() => {});
  return r;
}
