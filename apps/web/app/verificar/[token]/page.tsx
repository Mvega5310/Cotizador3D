import { tokenVerificacionValido } from "@/lib/actions/auth";
import BotonConfirmarVerificacion from "@/components/BotonConfirmarVerificacion";
import TarjetaCuenta from "@/components/TarjetaCuenta";

export default async function VerificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = await tokenVerificacionValido(token);

  return (
    <TarjetaCuenta titulo="Confirmar correo">
      {valido ? (
        <BotonConfirmarVerificacion token={token} />
      ) : (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          Este enlace ya no sirve (venció o ya se usó). Pide uno nuevo desde tu panel.
        </p>
      )}
    </TarjetaCuenta>
  );
}
