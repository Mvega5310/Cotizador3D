import { tokenVerificacionValido } from "@/lib/actions/auth";
import BotonConfirmarVerificacion from "@/components/BotonConfirmarVerificacion";

export default async function VerificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = await tokenVerificacionValido(token);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Confirmar correo</h1>
        {valido ? (
          <BotonConfirmarVerificacion token={token} />
        ) : (
          <p className="text-sm text-red-600">
            Este enlace ya no sirve (venció o ya se usó). Pide uno nuevo desde tu panel.
          </p>
        )}
      </div>
    </main>
  );
}
