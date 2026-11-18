import { ayer, hoy } from "@/lib/fecha";
import { auth, db } from "@/lib/firebase";
import { rachaViva } from "@/lib/racha";
import { subida, subioN } from "@/lib/nivel";
import SubioNivel from "@/components/SubioNivel";
import { router, useFocusEffect } from "expo-router";
import { collection, doc, getDoc, getDocs, increment, updateDoc } from "firebase/firestore";
import { ReactNode, useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { Lucide } from "@react-native-vector-icons/lucide";
import { C } from "@/lib/colores";

type ramo = { id: string; nombres: string; color: string; meta?: number };
type sesion = { ramoId: string; minutos: number; dia: string };
type tarea = { id: string; titulo: string; ramoNombre: string; ramoId: string; fecha: string; listo: boolean; xp: number; hora?: string };


const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// niveles e insignias
const XP_NIVEL = 250;
const TITULOS = ["Recién llegado", "Aprendiz", "Curioso", "Constante", "Ratón de biblioteca", "Cerebrito", "Leyenda del ramo"];
const META_POMODOROS = 2;

const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const corto = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}`;
const formatear = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// para contar las horas de la semana
const lunes = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return formatear(d);
};

// semana del semestre
const semanaSemestre = () => {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() >= 6 ? 7 : 2, 1);
    inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7)); // al lunes de esa semana
    return Math.floor((ahora.getTime() - inicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
};

const vence = (f: string) => {
    if (f === hoy()) return "vence hoy";
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    if (f === formatear(manana)) return "vence mañana";
    const d = new Date(f + "T12:00:00");
    return `vence el ${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
};


const comentario = (minutos: number, metaHoras: number) => {
    const avance = minutos / (metaHoras * 60);
    if (avance >= 1) return "¡vas volando!";
    if (avance >= 0.5) return "bien ahí";
    if (minutos > 0) return "medio solito...";
    return "sin estudiar aún";
};

const ConSombra = ({ children, radio = 16, className = "", style }: { children: ReactNode; radio?: number; className?: string; style?: any }) => (
    <View className={className} style={style}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: radio, backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }]} />
        {children}
    </View>
);

export default function Inicio() {
    const [nombre, setNombre] = useState("");
    const [racha, setRacha] = useState(0);
    const [mejor, setMejor] = useState(0);
    const [xp, setXp] = useState(0);
    const [ultimoD, setUltimoD] = useState("");
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [sesiones, setSesiones] = useState<sesion[]>([]);
    const [tareaM, setTareaM] = useState<tarea | null>(null); // la entrega de misiones 
    const [nivelN, setNivelN] = useState<subida | null>(null); // pantalla de subir de nivel


    useFocusEffect(
        useCallback(() => {
            const cargarUser = async () => {
                const uid = auth.currentUser!.uid;
                const snap = await getDoc(doc(db, "usuarios", uid));
                if (snap.exists()) {
                    const datos = snap.data();
                    setNombre(datos.nombre);
                    setRacha(rachaViva(datos));
                    setMejor(datos.rachaMe ?? 0);
                    setXp(datos.xp ?? 0);
                    setUltimoD(datos.ultimoD ?? "");
                }

                const snapR = await getDocs(collection(db, "usuarios", uid, "ramos"));
                setRamos(snapR.docs.map((d) => ({ id: d.id, ...d.data() }) as ramo));

                const snapS = await getDocs(collection(db, "usuarios", uid, "sesion"));
                setSesiones(snapS.docs.map((d) => d.data() as sesion));


                const snapT = await getDocs(collection(db, "usuarios", uid, "tareas"));
                const pendiente = snapT.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as tarea)
                    .filter((t) => !t.listo && t.fecha >= hoy())
                    .sort((a, b) => (a.fecha + (a.hora ?? "")).localeCompare(b.fecha + (b.hora ?? "")))[0];
                setTareaM(pendiente ?? null);
            };
            cargarUser();
        }, [])
    );


    const marcarTarea = async () => {
        if (!tareaM) return;
        const uid = auth.currentUser!.uid;
        await updateDoc(doc(db, "usuarios", uid, "tareas", tareaM.id), { listo: !tareaM.listo });
        await updateDoc(doc(db, "usuarios", uid), {
            xp: increment(tareaM.listo ? -tareaM.xp : tareaM.xp)
        });
        setXp(xp + (tareaM.listo ? -tareaM.xp : tareaM.xp));
        if (!tareaM.listo) setNivelN(await subioN(uid, tareaM.xp));
        setTareaM({ ...tareaM, listo: !tareaM.listo });
    };

    // nivel
    const nivel = Math.floor(xp / XP_NIVEL) + 1;
    const siguiente = nivel * XP_NIVEL;
    const titulo = TITULOS[Math.min(nivel - 1, TITULOS.length - 1)];
    const avanceNivel = (xp - (nivel - 1) * XP_NIVEL) / XP_NIVEL;

    // horas de la semana por ramo
    const desdeLunes = lunes();
    const minutosSemana = (id: string) =>
        sesiones.filter((s) => s.ramoId === id && s.dia >= desdeLunes).reduce((suma, s) => suma + (s.minutos ?? 0), 0);

    // mision de pomodoros
    const ramoM = [...ramos].sort(
        (a, b) => minutosSemana(a.id) / ((a.meta ?? 4) * 60) - minutosSemana(b.id) / ((b.meta ?? 4) * 60)
    )[0];
    const pomodorosHoy = ramoM ? sesiones.filter((s) => s.ramoId === ramoM.id && s.dia === hoy()).length : 0;

    const misiones = [
        {
            texto: "No romper la racha",
            detalle: racha > 0 && ultimoD === ayer() ? "estudia hoy" : "",
            listo: ultimoD === hoy(),
            chip: null as string | null,
            onPress: () => router.push("/pomodoro"),
        },
        ...(ramoM ? [{
            texto: `${META_POMODOROS} pomodoros de ${ramoM.nombres}`,
            detalle: `${Math.min(pomodorosHoy, META_POMODOROS)}/${META_POMODOROS}`,
            listo: pomodorosHoy >= META_POMODOROS,
            chip: "+XP", // el XP depende del tiempo que elija en el pomodoro
            onPress: () => router.push("/pomodoro"),
        }] : []),
        ...(tareaM ? [{
            texto: tareaM.titulo,
            detalle: vence(tareaM.fecha),
            listo: tareaM.listo,
            chip: `+${tareaM.xp} XP`,
            onPress: marcarTarea,
        }] : []),
    ];
    const listas = misiones.filter((m) => m.listo).length;

    const ahora = new Date();
    const fechaTxt = `${DIAS[ahora.getDay()]} ${ahora.getDate()} · semana ${semanaSemestre()} del semestre`;

    return (
        <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: C.papel }}>
            {/* Fondo cuadriculado con svg*/}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Pattern id="hoja" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#hoja)" />
            </Svg>

            <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 480, alignSelf: "center", padding: 20, paddingBottom: 24 }}>

                <View className="mb-3 flex-row items-center justify-between">
                    <View>
                        <View className="absolute bottom-0 left-0 right-0 h-3" style={{ backgroundColor: C.boton }} />
                        <Text style={{ fontSize: 30, fontWeight: "900", color: C.tinta, letterSpacing: -1 }}>Studit</Text>
                    </View>
                    <View className="flex-row items-center gap-1 rounded-xl border-2 px-3 py-1.5" style={{ backgroundColor: C.durazno, borderColor: C.tinta }}>
                        <Lucide name="flame" size={18} color={C.coral} />
                        <Text className="font-bold" style={{ color: C.tinta }}>{racha} {racha === 1 ? "día" : "días"}</Text>
                    </View>
                </View>

                <Text className="mt-2 italic" style={{ color: C.verde }}>{fechaTxt}</Text>
                <Text className="mb-5 text-2xl" style={{ fontWeight: "900", color: C.tinta }}>HOLA{nombre ? `, ${nombre.toUpperCase()}` : ""}</Text>
                <ConSombra className="mb-8">
                    <View className="flex-row items-center gap-4 rounded-2xl border-2 p-4" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                        <View className="h-16 w-16 items-center justify-center rounded-xl border-2" style={{ backgroundColor: C.boton, borderColor: C.tinta }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 1, color: C.tinta }}>NIVEL</Text>
                            <Text style={{ fontSize: 24, fontWeight: "900", color: C.tinta }}>{nivel}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="mb-2 text-base font-bold" style={{ color: C.tinta }}>{titulo}</Text>
                            <View className="mb-2 h-3 overflow-hidden rounded-full border-2" style={{ borderColor: C.tinta, backgroundColor: C.blanco }}>
                                <View style={{ width: `${avanceNivel * 100}%`, height: "100%", backgroundColor: C.coral }} />
                            </View>
                            <Text className="text-sm" style={{ color: C.gris }}>
                                <Text className="font-bold" style={{ color: C.tinta }}>{miles(siguiente - xp)} XP</Text> para el nivel {nivel + 1}
                            </Text>
                        </View>
                    </View>
                </ConSombra>

                {/* Misiones */}
                <View className="mb-3 flex-row items-end justify-between">
                    <Text className="text-xl" style={{ fontWeight: "900", color: C.tinta }}>Misiones de hoy</Text>
                    <Pressable onPress={() => router.push("/tareas")}>
                        <Text className="italic" style={{ color: C.verde }}>
                            {listas} de {misiones.length} {misiones.length === 1 ? "lista" : "listas"} · <Text className="font-bold underline">agenda</Text>
                        </Text>
                    </Pressable>
                </View>
                {misiones.map((m) => (
                    <Pressable
                        key={m.texto}
                        onPress={m.onPress}
                        className="mb-3 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3"
                        style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                    >
                        <View
                            className="h-6 w-6 items-center justify-center rounded-md border-2"
                            style={{ borderColor: C.tinta, backgroundColor: m.listo ? C.verde : C.blanco }}
                        >
                            {m.listo && <Text className="font-bold" style={{ color: C.blanco, fontSize: 12 }}>✓</Text>}
                        </View>
                        <Text className={`flex-1 text-base ${m.listo ? "line-through" : ""}`} style={{ color: m.listo ? C.gris : C.tinta }}>
                            <Text className="font-bold">{m.texto}</Text>
                            {m.detalle ? (
                                <Text style={{ color: m.detalle.startsWith("vence") ? C.coral : C.gris }}> · {m.detalle}</Text>
                            ) : null}
                        </Text>
                        {m.chip && (
                            <View className="rounded-full border-2 px-2 py-1" style={{ borderColor: C.coral, backgroundColor: C.durazno }}>
                                <Text className="text-xs font-bold" style={{ color: C.tinta }}>{m.chip}</Text>
                            </View>
                        )}
                    </Pressable>
                ))}

                {/* Ramos de la semana */}
                <View className="mb-3 mt-5">
                    <Text className="text-xl" style={{ fontWeight: "900", color: C.tinta }}>Tus ramos esta semana</Text>
                </View>
                {ramos.length === 0 ? (
                    <Pressable
                        onPress={() => router.push("/materias")}
                        className="items-center rounded-2xl border-2 border-dashed p-6"
                        style={{ borderColor: C.gris }}
                    >
                        <Text style={{ color: C.gris }}>Aún no tienes ramos. Toca para agregar el primero.</Text>
                    </Pressable>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 2, paddingBottom: 8, paddingRight: 8 }}>
                        {ramos.map((r) => {
                            const min = minutosSemana(r.id);
                            return (
                                <ConSombra key={r.id} radio={6}>
                                    <View className="rounded-md border-2 p-3" style={{ width: 100, minHeight: 110, backgroundColor: r.color, borderColor: C.tinta }}>
                                        <Text className="mb-2 font-bold" style={{ color: C.tinta }} numberOfLines={2}>{r.nombres}</Text>
                                        <Text style={{ fontSize: 22, fontWeight: "900", color: C.tinta }}>{corto(min)}</Text>
                                        <Text className="text-xs" style={{ color: C.tinta }}>{comentario(min, r.meta ?? 4)}</Text>
                                    </View>
                                </ConSombra>
                            );
                        })}
                    </ScrollView>
                )}

                <ConSombra className="mt-8">
                    <Pressable
                        onPress={() => router.push("/pomodoro")}
                        className="flex-row items-center justify-center gap-3 rounded-2xl border-2 py-4"
                        style={{ backgroundColor: C.boton, borderColor: C.tinta }}
                    >
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M6 3 L21 12 L6 21 Z" fill={C.tinta} />
                        </Svg>
                        <Text className="text-lg font-bold" style={{ color: C.tinta }}>Empezar pomodoro</Text>
                    </Pressable>
                </ConSombra>
            </ScrollView>

            <SubioNivel datos={nivelN} onCerrar={() => setNivelN(null)} />
        </SafeAreaView>
    );
}
