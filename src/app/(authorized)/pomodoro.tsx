import { auth, db } from "@/lib/firebase";
import { addDoc, collection, doc, getDocs, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";

// Paleta del diseño
const C = {
    fondo: "#F8FAF7",
    cuadricula: "#9CD0C9",
    verde: "#2E6B5E",
    pista: "#C6E6E0",
    puntos: "#9BBFB8",
    tinta: "#1A1A1A",
    gris: "#5B6B68",
    coral: "#F07A5A",
    boton: "#A6E0D7",
    blanco: "#FFFFFF",
};

// medidas para el  anillo
const TAM = 270;
const GROSOR = 22;
const RADIO = (TAM - GROSOR) / 2;
const CIRC = 2 * Math.PI * RADIO;

type ramo = { id: string; nombres: string; color: string }
const tiempo = 10 * 60
const xpPomodoro = 10;

const fecha = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export default function Pomodoro() {
    const [segundo, setSegundo] = useState(tiempo)
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [ramoE, setRamoE] = useState<ramo | null>(null);
    const [mensaje, setMensaje] = useState("");
    const [horaF, setHoraF] = useState<number | null>(null);
    const uid = auth.currentUser!.uid;
    const empiezaT = horaF !== null;

    useEffect(() => {
        const cargar = async () => {
            const snap = await getDocs(collection(db, "usuarios", uid, "ramos"));
            setRamos(snap.docs.map((t) => ({ id: t.id, ...t.data() }) as ramo));
        };
        cargar();
    }, []);

    const terminoT = async (minutos: number, completo: boolean) => {
        try {
            await addDoc(collection(db, "usuarios", uid, "sesion"), {
                ramoId: ramoE!.id,
                ramoNombre: ramoE!.nombres,
                minutos: minutos,
                dia: fecha(),
                creado: serverTimestamp(),
            });
            if (completo) {
                await updateDoc(doc(db, "usuarios", uid), {
                    xp: increment(xpPomodoro)
                });
            }
            await updateDoc(doc(db, "usuarios", uid, "ramos", ramoE!.id), {
                minutos: increment(minutos)
            });
            setMensaje(completo ? `Fin +${xpPomodoro} XP` : `Guardado: ${minutos} min de ${ramoE!.nombres}`);
        } catch (e: any) {
            setMensaje(e.code)
        }
        setSegundo(tiempo);
    };

    useEffect(() => {
        if (horaF === null)
            return;
        const idH = setInterval(() => {
            const faltan = Math.max(0, Math.round((horaF - Date.now()) / 1000));
            setSegundo(faltan);
            if (faltan == 0) {
                clearInterval(idH);
                setHoraF(null);
                terminoT(tiempo / 60, true);
            }
        }, 500);
        return () => clearInterval(idH);
    }, [horaF]);

    const inicioT = () => {
        if (!ramoE) return setMensaje("Escoge el ramo para iniciar");
        setMensaje('');
        setHoraF(Date.now() + segundo * 1000);
    };

    const pausa = () => setHoraF(null);
    const reinicio = () => {
        setHoraF(null)
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


    const empezo = segundo < tiempo;
    const avance = (tiempo - segundo) / tiempo;
    const colorAnillo = ramoE?.color ?? C.verde;   // para el color escogido

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: C.fondo }}>
            {/* Fondo cuadriculado, se crea un svg como diseno */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Pattern id="cuadros" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#cuadros)" />
            </Svg>

            <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
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
                    <View className="rounded-full border-2 px-4 py-1.5" style={{ backgroundColor: ramoE?.color ?? C.blanco, borderColor: C.tinta }}>
                        <Text className="font-bold" style={{ color: C.tinta }}>{ramoE ? ramoE.nombres : "Sin ramo"}</Text>
                    </View>
                </View>

                <Text className="mb-1 text-base italic" style={{ color: C.verde }}>
                    modo foco · pomodoro de {tiempo / 60} min
                </Text>
                <Text className="mb-4 text-3xl" style={{ color: C.tinta, fontWeight: "900" }}>
                    {ramoE ? ramoE.nombres : "¿Qué vas a estudiar?"}
                </Text>

                {/* Elegir ramo: solo antes de partir */}
                {!empezo && (
                    <View className="mb-2 flex-row flex-wrap gap-2">
                        {ramos.length === 0 && <Text style={{ color: C.gris }}>Primero agrega un ramo en Mis materias.</Text>}
                        {ramos.map((r) => (
                            <Pressable
                                key={r.id}
                                disabled={empiezaT}
                                onPress={() => setRamoE(r)}
                                className={`rounded-full px-4 py-2 ${ramoE?.id === r.id ? "border-[3px]" : "border"}`}
                                style={{ backgroundColor: r.color, borderColor: C.tinta }}
                            >
                                <Text className="font-bold" style={{ color: C.tinta }}>{r.nombres}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Anillo del reloj */}
                <View className="my-6 items-center justify-center" style={{ height: TAM }}>
                    <Svg width={TAM} height={TAM} style={{ transform: [{ rotate: "-90deg" }] }}>
                        <Circle cx={TAM / 2} cy={TAM / 2} r={RADIO} stroke={colorAnillo} strokeOpacity={0.3} strokeWidth={GROSOR} fill="none" />
                        {avance > 0 && (
                            <Circle
                                cx={TAM / 2}
                                cy={TAM / 2}
                                r={RADIO}
                                stroke={colorAnillo}
                                strokeWidth={GROSOR}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={CIRC}
                                strokeDashoffset={CIRC * (1 - avance)}
                            />
                        )}
                        <Circle cx={TAM / 2} cy={TAM / 2} r={RADIO - GROSOR} fill={C.blanco} />
                        <Circle
                            cx={TAM / 2}
                            cy={TAM / 2}
                            r={RADIO - GROSOR - 10}
                            stroke={C.puntos}
                            strokeWidth={2}
                            strokeDasharray="1 7"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </Svg>
                    <View className="absolute items-center">
                        <Text style={{ fontSize: 68, fontWeight: "900", letterSpacing: -2, color: C.tinta }}>
                            {minuto}:{seg}
                        </Text>
                        <Text style={{ color: C.gris }}>quedan de {tiempo / 60}:00</Text>
                    </View>
                </View>

                <Text className="mb-4 text-center text-base italic" style={{ color: C.verde }}>
                    {mensaje !== "" ? mensaje : empiezaT ? "concéntrate, tú puedes" : "elige un ramo e inicia"}
                </Text>

                <View className="mb-6 flex-row justify-center gap-2">
                    <View className="rounded-full border-2 px-3 py-1" style={{ backgroundColor: C.coral, borderColor: C.tinta }}>
                        <Text className="font-bold" style={{ color: C.tinta }}>+{xpPomodoro} XP al terminar</Text>
                    </View>
                    <View className="rounded-full border-2 px-3 py-1" style={{ backgroundColor: C.blanco, borderColor: C.verde }}>
                        <Text className="font-bold" style={{ color: C.verde }}>{tiempo / 60} min de foco</Text>
                    </View>
                </View>

            
                <View className="flex-1" />
                <View className="mb-5">
                    <View className="absolute inset-0 rounded-2xl" style={{ backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }} />
                    <Pressable
                        onPress={empiezaT ? pausa : inicioT}
                        className="flex-row items-center justify-center gap-3 rounded-2xl border-2 py-4"
                        style={{ backgroundColor: C.boton, borderColor: C.tinta }}
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
                    {empezo && (
                        <Pressable onPress={detener}>
                            <Text className="underline" style={{ color: C.gris }}>Terminar y guardar</Text>
                        </Pressable>
                    )}
                    <Pressable onPress={reinicio}>
                        <Text className="underline" style={{ color: C.gris }}>Reiniciar</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}