import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const XP_NIVEL = 250;
export const TITULOS = ["Recién llegado", "Aprendiz", "Curioso", "Constante", "Ratón de biblioteca", "Cerebrito", "Leyenda del ramo"];

export const nivelDe = (xp: number) => Math.floor(xp / XP_NIVEL) + 1;
export const tituloDe = (nivel: number) => TITULOS[Math.min(nivel - 1, TITULOS.length - 1)];

export type subida = { nivel: number; nombre: string };
// Devuelve el nivel nuevo si subio, o null
export const subioN = async (uid: string, sumado: number): Promise<subida | null> => {
    if (sumado <= 0) return null;
    const snap = await getDoc(doc(db, "usuarios", uid));
    const datos = snap.data();
    const xp = datos?.xp ?? 0;
    const nivelA = nivelDe(xp - sumado);
    const nivelN = nivelDe(xp);
    if (nivelN <= nivelA) return null;
    return { nivel: nivelN, nombre: datos?.nombre ?? "" };
};
