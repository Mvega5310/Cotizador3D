import { requireSession } from "@/lib/session";
import FormularioSubirPlanos from "@/components/FormularioSubirPlanos";

export default async function NuevoProyectoPage() {
  await requireSession();
  return <FormularioSubirPlanos />;
}
