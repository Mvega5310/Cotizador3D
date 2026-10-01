import path from "path";

// Carpeta para archivos generados o subidos (planos, PDF). En local queda en
// apps/web/.data; en el servidor se apunta DATA_DIR a un disco persistente
// (en Railway, un Volumen montado en /data) para que no se borre en cada
// despliegue.
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
