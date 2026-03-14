import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, deleteFromR2, keyFromUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 8;

/** POST /api/upload
 *  FormData fields:
 *    - file: File (required)
 *    - folder: string (e.g. "servicios", "portfolio", "home") — default "gestion"
 *    - old_url: string (optional) URL anterior a eliminar del bucket
 */
export async function POST(req: Request) {
  // Auth: solo admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  // Leer FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo no permitido. Usa: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `El archivo supera el límite de ${MAX_SIZE_MB} MB` },
      { status: 400 }
    );
  }

  const folder = (formData.get("folder") as string) || "gestion";
  const oldUrl = formData.get("old_url") as string | null;

  // Extensión y ruta en el bucket
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `${folder}/${randomUUID()}.${ext}`;

  // Subir a R2
  const buffer = Buffer.from(await file.arrayBuffer());
  let url: string;
  try {
    url = await uploadToR2({ buffer, key, contentType: file.type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al subir el archivo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Eliminar imagen anterior si se indicó
  if (oldUrl) {
    const oldKey = keyFromUrl(oldUrl);
    if (oldKey) {
      await deleteFromR2(oldKey).catch(() => {
        // No fallar si no se puede borrar la imagen anterior
      });
    }
  }

  return NextResponse.json({ url, key });
}
