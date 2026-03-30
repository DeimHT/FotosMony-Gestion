export type UploadProgressFn = (loaded: number, total: number) => void;

export type UploadEventoResult = { url: string; key: string; nombreArchivo: string };

/** Sube una imagen a /api/upload (carpeta eventos) con progreso por bytes vía XHR. */
export function uploadEventoImage(file: File, onProgress?: UploadProgressFn): Promise<UploadEventoResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "eventos");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { url?: string; key?: string; error?: string };
          if (!json.url || !json.key) reject(new Error(json.error ?? "Error al subir"));
          else resolve({ url: json.url, key: json.key, nombreArchivo: file.name });
        } catch {
          reject(new Error("Respuesta inválida del servidor"));
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(json.error ?? `Error ${xhr.status}`));
        } catch {
          reject(new Error(`Error ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Error de red al subir")));
    xhr.addEventListener("abort", () => reject(new Error("Subida cancelada")));

    xhr.open("POST", "/api/upload");
    xhr.send(fd);
  });
}

/** Porcentaje 0–100 del lote completo según bytes ya completados de archivos anteriores + archivo actual. */
export function batchBytesPercent(completedBytesBefore: number, loaded: number, totalBatchBytes: number): number {
  if (totalBatchBytes <= 0) return 100;
  return Math.min(100, Math.round(((completedBytesBefore + loaded) / totalBatchBytes) * 100));
}
