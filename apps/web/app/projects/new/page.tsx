import { requireSession } from "@/lib/session";
import { EJEMPLOS } from "@/lib/ejemplos";
import FormulariosNuevo from "@/components/FormulariosNuevo";

export default async function NuevoProyectoPage() {
  await requireSession();
  return <FormulariosNuevo ejemplos={EJEMPLOS} />;
}
