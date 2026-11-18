import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ayer, hoy } from "@/lib/fecha";

export const actualizarR = async (uid: string) => {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const datos = snap.data()!;

    if (datos.ultimoD === hoy()) return;

    const racha = datos.ultimoD === ayer() ? (datos.rachaAc ?? 0) + 1 : 1;
    await updateDoc(ref, {
        ultimoD: hoy(),
        rachaAc: racha,
        rachaMe: Math.max(racha, datos.rachaMe ?? 0),
    });
};
export const rachaViva = (datos: any) =>
    datos.ultimoD === hoy() || datos.ultimoD === ayer() ? (datos.rachaAc ?? 0) : 0;
