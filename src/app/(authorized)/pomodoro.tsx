import { auth, db } from "@/lib/firebase";
import { addDoc, collection, doc, getDocs, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { Lucide } from "@react-native-vector-icons/lucide";
import { actualizarR } from "@/lib/racha";
import { hoy, ayer } from "@/lib/fecha";
import { subida, subioN } from "@/lib/nivel";
import SubioNivel from "@/components/SubioNivel";
import { C } from "@/lib/colores";


// ANILLO 
const TAM = 250;
const GROSOR = 26;
const RADIO = (TAM - GROSOR) / 2;
const CIRC = 2 * Math.PI * RADIO;

type ramo = { id: string; nombres: string; color: string }
type tarea = { ramoId: string; titulo: string; fecha: string; listo: boolean }

//OSCURECE MULTIPLICANDO POR 0.5
const oscurecer = (hex: string, factor = 0.7) => {
    const canal = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * factor).toString(16).padStart(2, "0");
    return `#${canal(1)}${canal(3)}${canal(5)}`;
};
//TIEMPO +10...
const MIN_FOCO = 10;
const MAX_FOCO = 60;
const PASO = 10;
const xpDe = (min: number) => (min <= 20 ? min : 20 + Math.round((min - 20) * 1.5));//EX POR CADA 10 MIN
// descansos
const DESCANSO = 5 * 60;
const DESCANSO_LARGO = 15 * 60;
const CADA = 4;

//PARA PROBAR PONER 60, ES EN SEGUNDO
const VELOCIDAD = 1;

export default function Pomodoro() {
    const [tiempo, setTiempo] = useState(10 * 60);
    const [xpPomodoro, setXpPomodoro] = useState(10);
    const [modo, setModo] = useState<"foco" | "descanso">("foco");
    const [hechos, setHechos] = useState(0);          // pomodoros completos seguidos
    const [pausaS, setPausaS] = useState(DESCANSO);   // segundos del descanso que toca
    const [segundo, setSegundo] = useState(tiempo)
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [ramoE, setRamoE] = useState<ramo | null>(null);
    const [menuR, setMenuR] = useState(false);   // menu plegable de ramos abierto o cerrado
    const [avisoR, setAvisoR] = useState(false); // ventana flotante 
    const [tareasP, setTareasP] = useState<tarea[]>([]); // entregas pendientes
    const [mensaje, setMensaje] = useState("");
    const [horaF, setHoraF] = useState<number | null>(null);
    const [nivelN, setNivelN] = useState<subida | null>(null); // pantalla de subir de nivel
    const uid = auth.currentUser!.uid;
    const empiezaT = horaF !== null;

    useFocusEffect(
        useCallback(() => {
            const cargar = async () => {
                const snap = await getDocs(collection(db, "usuarios", uid, "ramos"));
                setRamos(snap.docs.map((t) => ({ id: t.id, ...t.data() }) as ramo));
                const snapT = await getDocs(collection(db, "usuarios", uid, "tareas"));
                setTareasP(snapT.docs.map((t) => t.data() as tarea).filter((t) => !t.listo && t.fecha >= hoy()));
            };
            cargar();
        }, [])
    );

    const terminoT = async (minutos: number, completo: boolean) => {
        try {
            await addDoc(collection(db, "usuarios", uid, "sesion"), {
                ramoId: ramoE!.id,
                ramoNombre: ramoE!.nombres,
                minutos: minutos,
                dia: hoy(),
                creado: serverTimestamp(),
            });
            if (completo) {
                await updateDoc(doc(db, "usuarios", uid), {
                    xp: increment(xpPomodoro)
                });
                setNivelN(await subioN(uid, xpPomodoro));
            }
            await updateDoc(doc(db, "usuarios", uid, "ramos", ramoE!.id), {
                minutos: increment(minutos)
            });
            setMensaje(completo ? `Fin +${xpPomodoro} XP` : `Guardado: ${minutos} min de ${ramoE!.nombres}`);
            await actualizarR(uid);
        } catch (e: any) {
            setMensaje(e.code)
        }
        setSegundo(tiempo);


    };

    useEffect(() => {
        if (horaF === null)
            return;
        const idH = setInterval(() => {
            const faltan = Math.max(0, Math.round(((horaF - Date.now()) * VELOCIDAD) / 1000));
            setSegundo(faltan);
            if (faltan == 0) {
                clearInterval(idH);
                setHoraF(null);
                if (modo === "foco") finFoco();
                else finDescanso();
            }
        }, Math.max(50, 500 / VELOCIDAD));
        return () => clearInterval(idH);
    }, [horaF]);


    const finFoco = async () => {
        await terminoT(tiempo / 60, true);
        const total = hechos + 1;
        const d = total % CADA === 0 ? DESCANSO_LARGO : DESCANSO;
        setHechos(total);
        setPausaS(d);
        setModo("descanso");
        setSegundo(d);
        setHoraF(Date.now() + (d * 1000) / VELOCIDAD);
    };

    const finDescanso = () => {
        setHoraF(null);
        setModo("foco");
        setSegundo(tiempo);
        setMensaje("¡Descanso listo! Inicia el siguiente pomodoro");
    };

    // BOTON +-
    const cambiarTiempo = (delta: number) => {
        const min = Math.min(MAX_FOCO, Math.max(MIN_FOCO, tiempo / 60 + delta));
        setTiempo(min * 60);
        setXpPomodoro(xpDe(min));
        setSegundo(min * 60);
    };

    const cambiarModo = (m: "foco" | "corto" | "largo") => {
        if (empiezaT) return;
        setMensaje("");
        if (m === "foco") {
            setModo("foco");
            setSegundo(tiempo);
            return;
        }
        const d = m === "largo" ? DESCANSO_LARGO : DESCANSO;
        setModo("descanso");
        setPausaS(d);
        setSegundo(d);
    };

    const inicioT = () => {
        if (!ramoE && modo === "foco") {
            setMenuR(false);
            return setAvisoR(true);
        }
        setMenuR(false);
        setMensaje('');
        setHoraF(Date.now() + (segundo * 1000) / VELOCIDAD);
    };

    const pausa = () => setHoraF(null);
    const reinicio = () => {
        setHoraF(null)
        setModo("foco");
        setSegundo(tiempo);
    };

    const detener = () => {
        const minutosE = Math.floor((tiempo - segundo) / 60);
        setHoraF(null);
        if (minutosE < 1) {
            setSegundo(tiempo);
            return setMensaje("Muy corto, estudia un poco mas");
        }
        terminoT(minutosE, false);
    };
    const seg = String(segundo % 60).padStart(2, "0")
    const minuto = String(Math.floor(segundo / 60)).padStart(2, "0");


    const duracion = modo === "foco" ? tiempo : pausaS;  // lo que dura el reloj ahora
    const empezo = segundo < duracion;

    const cambiarR = !(modo === "foco" && empezo);
    const avance = (duracion - segundo) / duracion;

    const base = modo === "descanso" ? C.boton : ramoE?.color ?? C.boton;
    const oscuro = oscurecer(base, 0.55);
    const enCiclo = modo === "descanso" ? ((hechos - 1) % CADA) + 1 : hechos % CADA;
    const sigue =
        modo === "descanso"
            ? `pomodoro ${tiempo / 60} min`
            : (hechos + 1) % CADA === 0 ? `break largo ${DESCANSO_LARGO / 60} min` : `break ${DESCANSO / 60} min`;

    const entrega = tareasP
        .filter((t) => t.ramoId === ramoE?.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    const titulo =
        modo === "descanso" ? "Respira un poco " : entrega ? entrega.titulo : ramoE ? ramoE.nombres : "¿Qué vas a estudiar?";
    const subtitulo =
        modo === "foco"
            ? `modo foco · pomodoro ${enCiclo + 1} de ${CADA}`
            : pausaS === DESCANSO_LARGO ? `break largo · ${pausaS / 60} min` : `break · ${pausaS / 60} min`;

    const botonTiempo = (delta: number) => {
        const tope = delta < 0 ? tiempo / 60 <= MIN_FOCO : tiempo / 60 >= MAX_FOCO;
        return (
            <View style={{ opacity: tope ? 0.35 : 1 }}>
                <View className="absolute inset-0 rounded-xl" style={{ backgroundColor: C.tinta, transform: [{ translateX: 2 }, { translateY: 3 }] }} />
                <Pressable
                    onPress={() => cambiarTiempo(delta)}
                    disabled={tope}
                    className="h-12 w-12 items-center justify-center rounded-xl border-2"
                    style={{ backgroundColor: base, borderColor: C.tinta }}
                >
                    <Text style={{ fontSize: 26, fontWeight: "900", color: C.tinta, marginTop: -2 }}>{delta < 0 ? "−" : "+"}</Text>
                </Pressable>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: C.fondo }}>
            {/* Fondo */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Pattern id="cuadros" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#cuadros)" />
            </Svg>

            <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
                {/* Encabezado */}
                <View className="mb-5 flex-row items-center justify-between">
                    <Pressable
                        onPress={() => router.back()}
                        className="h-11 w-11 items-center justify-center rounded-xl border-2"
                        style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                    >
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                            <Path d="M15 5 L8 12 L15 19" fill="none" stroke={C.tinta} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    {/* Ramo  */}
                    <Pressable
                        onPress={() => setMenuR(!menuR)}
                        disabled={cambiarR === false}
                        className="flex-row items-center gap-2 rounded-full border-2 px-4 py-1.5"
                        style={{ backgroundColor: ramoE?.color ?? C.blanco, borderColor: C.tinta }}
                    >
                        <Text className="font-bold" style={{ color: C.tinta }}>{ramoE ? ramoE.nombres : "Elegir ramo"}</Text>
                        {cambiarR && (
                            <Svg width={12} height={12} viewBox="0 0 24 24" style={{ transform: [{ rotate: menuR ? "180deg" : "0deg" }] }}>
                                <Path d="M5 9 L12 16 L19 9" fill="none" stroke={C.tinta} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        )}
                    </Pressable>
                </View>

                {menuR && cambiarR && (
                    <View className="mb-6">
                        <View className="absolute inset-0 rounded-2xl" style={{ backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }} />
                        <View className="rounded-2xl border-2 p-2" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                            <Text className="px-2 pb-1 pt-1 font-bold" style={{ color: C.gris }}>¿Qué vas a estudiar?</Text>
                            {ramos.length === 0 && (
                                <Text className="px-2 py-2" style={{ color: C.gris }}>Primero agrega un ramo en Mis ramos.</Text>
                            )}
                            {ramos.map((r) => {
                                const elegido = ramoE?.id === r.id;
                                return (
                                    <Pressable
                                        key={r.id}
                                        onPress={() => {
                                            setRamoE(elegido ? null : r); // tocar el ya elegido lo deselecciona
                                            setMenuR(false);
                                            setMensaje("");
                                        }}
                                        className="flex-row items-center gap-3 rounded-xl px-2 py-2.5"
                                        style={{ backgroundColor: elegido ? C.pista : "transparent" }}
                                    >
                                        <View className="h-5 w-5 rounded-full border-2" style={{ backgroundColor: r.color, borderColor: C.tinta }} />
                                        <Text className={`flex-1 text-base ${elegido ? "font-bold" : ""}`} style={{ color: C.tinta }}>{r.nombres}</Text>
                                        {elegido && <Text className="font-bold" style={{ color: C.verde }}>✓</Text>}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                <Text className="text-base italic" style={{ color: oscuro }}>{subtitulo}</Text>
                <Text className="text-2xl" style={{ fontWeight: "900", color: C.tinta }} numberOfLines={2}>{titulo}</Text>

                {!empiezaT && (
                    <View className="mt-4 flex-row gap-2">
                        {[
                            { nombre: "Pomodoro", m: "foco" as const, activo: modo === "foco" },
                            { nombre: "Break", m: "corto" as const, activo: modo === "descanso" && pausaS === DESCANSO },
                            { nombre: "Break largo", m: "largo" as const, activo: modo === "descanso" && pausaS === DESCANSO_LARGO },
                        ].map((p) => (
                            <Pressable
                                key={p.nombre}
                                onPress={() => cambiarModo(p.m)}
                                className="rounded-lg px-3 py-1"
                                style={{
                                    borderWidth: 2,
                                    borderColor: p.activo ? C.tinta : "transparent",
                                    backgroundColor: p.activo ? base : "transparent",
                                }}
                            >
                                <Text className={p.activo ? "font-bold" : ""} style={{ color: p.activo ? C.tinta : C.gris }}>{p.nombre}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View className="my-6 items-center justify-center" style={{ height: TAM }}>
                    <Svg width={TAM} height={TAM} style={{ transform: [{ rotate: "-90deg" }] }}>
                        <Circle cx={TAM / 2} cy={TAM / 2} r={RADIO} stroke={base} strokeWidth={GROSOR} fill="none" />
                        {avance > 0 && (
                            <Circle
                                cx={TAM / 2}
                                cy={TAM / 2}
                                r={RADIO}
                                stroke={oscuro}
                                strokeWidth={GROSOR}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={CIRC}
                                strokeDashoffset={CIRC * (1 - avance)}
                            />
                        )}
                        <Circle
                            cx={TAM / 2}
                            cy={TAM / 2}
                            r={RADIO - GROSOR - 8}
                            stroke={C.puntos}
                            strokeWidth={2}
                            strokeDasharray="1 7"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </Svg>
                    <View className="absolute items-center">
                        <Text style={{ fontSize: 64, fontWeight: "900", letterSpacing: -2, color: C.tinta }}>
                            {minuto}:{seg}
                        </Text>
                        <Text style={{ color: C.gris }}>quedan de {duracion / 60}:00</Text>
                        {modo === "foco" && (
                            <Text className="mt-1 font-bold" style={{ color: C.coral }}>★ +{xpPomodoro} XP</Text>
                        )}
                    </View>
                </View>

                <Text className="mb-4 text-center text-base italic" style={{ color: oscuro }}>
                    {mensaje !== "" ? mensaje : modo === "descanso" ? "descansa" : empiezaT ? "concéntrate, tú puedes" : "elige un ramo e inicia"}
                </Text>

                <View className="mb-6 rounded-xl border-2 p-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                    <View className="mb-2 flex-row gap-1.5">
                        {Array.from({ length: CADA }).map((_, i) => {
                            const listo = i < enCiclo;
                            const actual = modo === "foco" && i === enCiclo;
                            return (
                                <View
                                    key={i}
                                    className="h-3 flex-1 overflow-hidden rounded-full"
                                    style={{
                                        backgroundColor: listo ? oscuro : base,
                                        opacity: listo || actual ? 1 : 0.4,
                                        borderWidth: actual ? 2 : 0,
                                        borderColor: C.tinta,
                                    }}
                                >
                                    {actual && <View style={{ width: `${avance * 100}%`, height: "100%", backgroundColor: oscuro }} />}
                                </View>
                            );
                        })}
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-xs" style={{ color: C.gris }}>{hechos} {hechos === 1 ? "pomodoro" : "pomodoros"} seguidos</Text>
                        <Text className="text-xs" style={{ color: C.gris }}>
                            sigue: <Text className="font-bold" style={{ color: C.tinta }}>{sigue}</Text>
                        </Text>
                    </View>
                </View>
                {!empezo && modo === "foco" && (
                    <View className="mb-6 flex-row items-center justify-between rounded-2xl border-2 px-3 py-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                        {botonTiempo(-PASO)}
                        <View className="items-center">
                            <Text className="text-xs" style={{ color: C.gris }}>tiempo de foco</Text>
                            <Text className="text-2xl" style={{ fontWeight: "900", color: C.tinta }}>{tiempo / 60} min</Text>
                            <Text className="font-bold" style={{ color: C.coral }}>★ +{xpPomodoro} XP</Text>
                        </View>
                        {botonTiempo(PASO)}
                    </View>
                )}

                <View className="flex-1" />
                <View className="mb-4">
                    <View className="absolute inset-0 rounded-2xl" style={{ backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }} />
                    <Pressable
                        onPress={empiezaT ? pausa : inicioT}
                        className="flex-row items-center justify-center gap-3 rounded-2xl border-2 py-4"
                        style={{ backgroundColor: base, borderColor: C.tinta }}
                    >
                        {empiezaT ? (
                            <View className="flex-row gap-1">
                                <View className="h-4 w-1.5 rounded-sm" style={{ backgroundColor: C.tinta }} />
                                <View className="h-4 w-1.5 rounded-sm" style={{ backgroundColor: C.tinta }} />
                            </View>
                        ) : (
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M6 3 L21 12 L6 21 Z" fill={C.tinta} />
                            </Svg>
                        )}
                        <Text className="text-lg font-bold" style={{ color: C.tinta }}>
                            {empiezaT ? "Pausar" : empezo ? "Continuar" : "Iniciar"}
                        </Text>
                    </Pressable>
                </View>

                <View className="flex-row justify-center gap-8">
                    {modo === "descanso" ? (
                        <Pressable onPress={finDescanso}>
                            <Text className="underline" style={{ color: C.gris }}>Saltar break</Text>
                        </Pressable>
                    ) : empezo && (
                        <Pressable onPress={detener}>
                            <Text className="underline" style={{ color: C.gris }}>Rendirme</Text>
                        </Pressable>
                    )}
                    {!empiezaT && empezo && (
                        <Pressable onPress={reinicio}>
                            <Text className="underline" style={{ color: C.gris }}>Reiniciar</Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>

            <Modal visible={avisoR} transparent animationType="fade" onRequestClose={() => setAvisoR(false)}>
                <Pressable
                    onPress={() => setAvisoR(false)}
                    className="flex-1 items-center justify-center px-8"
                    style={{ backgroundColor: "rgba(26,26,26,0.45)" }}
                >

                    <Pressable onPress={() => { }} style={{ width: "100%", maxWidth: 380 }}>
                        <View className="absolute inset-0 rounded-3xl" style={{ backgroundColor: C.tinta, transform: [{ translateX: 4 }, { translateY: 5 }] }} />
                        <View className="rounded-3xl border-2 p-6" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                            <View className="mb-2 items-center">
                                <Lucide name="book-open" size={40} color={C.tinta} />
                            </View>
                            <Text className="mb-1 text-center text-2xl" style={{ fontWeight: "900", color: C.tinta }}>Falta la materia!</Text>
                            <Text className="mb-5 text-center" style={{ color: C.gris }}>
                                Elige con que vas a empezar tu pomodoro
                            </Text>

                            {ramos.length === 0 ? (
                                <Text className="mb-5 text-center" style={{ color: C.gris }}>Primero agrega un ramo en Mis ramos.</Text>
                            ) : (
                                <View className="mb-5 gap-2">
                                    {ramos.map((r) => (
                                        <Pressable
                                            key={r.id}
                                            onPress={() => {
                                                setRamoE(r);
                                                setAvisoR(false);
                                                setMensaje("");
                                                setHoraF(Date.now() + (segundo * 1000) / VELOCIDAD);
                                            }}
                                            className="flex-row items-center gap-3 rounded-xl border-2 px-3 py-3"
                                            style={{ backgroundColor: r.color, borderColor: C.tinta }}
                                        >
                                            <Text className="flex-1 text-base font-bold" style={{ color: C.tinta }}>{r.nombres}</Text>
                                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                                <Path d="M6 3 L21 12 L6 21 Z" fill={C.tinta} />
                                            </Svg>
                                        </Pressable>
                                    ))}
                                </View>
                            )}

                            <Pressable onPress={() => setAvisoR(false)}>
                                <Text className="text-center underline" style={{ color: C.gris }}>Ahora no</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <SubioNivel datos={nivelN} onCerrar={() => setNivelN(null)} />
        </SafeAreaView>
    );
}