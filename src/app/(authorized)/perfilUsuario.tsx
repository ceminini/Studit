import { auth, db } from "@/lib/firebase";
import { formateo, hoy } from "@/lib/fecha";
import { nivelDe, TITULOS, tituloDe, XP_NIVEL } from "@/lib/nivel";
import { rachaViva } from "@/lib/racha";
import { probarNotificacion } from "@/lib/notificaciones";
import { useFocusEffect } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { ReactNode, useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { Lucide, LucideIconName } from "@react-native-vector-icons/lucide";
import { C } from "@/lib/colores";


const DIAS_L = ["L", "M", "M", "J", "V", "S", "D"];

type sesion = { minutos: number; dia: string; creado?: any; ramoId?: string };
type ramo = { id: string; nombres: string; color: string };

const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// 12400 -> "12,4k"
const corto = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",").replace(",0", "")}k` : String(n));

// los 7 dias (lunes a domingo) de esta semana, como "2026-11-16"
const semanaA = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
        const x = new Date(d);
        x.setDate(d.getDate() + i);
        return formateo(x);
    });
};

const ConSombra = ({ children, radio = 16, className = "", style }: { children: ReactNode; radio?: number; className?: string; style?: any }) => (
    <View className={className} style={style}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: radio, backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }]} />
        {children}
    </View>
);

// iconos de Lucide (https://lucide.dev/icons para ver los nombres)
const IconoI = ({ nombre, tam = 24, color = C.tinta }: { nombre: LucideIconName; tam?: number; color?: string }) => (
    <Lucide name={nombre} size={tam} color={color} />
);

// Anillo de nivel: el arco coral es lo que llevas del nivel
const Anillo = ({ nivel, avance }: { nivel: number; avance: number }) => {
    const r = 34;
    const largo = 2 * Math.PI * r;
    return (
        <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
            <Svg width={84} height={84} style={StyleSheet.absoluteFill}>
                <Circle cx={42} cy={42} r={r} stroke={C.durazno} strokeWidth={9} fill="none" />
                <Circle
                    cx={42} cy={42} r={r} stroke={C.coral} strokeWidth={9} fill="none"
                    strokeDasharray={`${largo * avance} ${largo}`} strokeLinecap="round"
                    transform="rotate(-90 42 42)"
                />
            </Svg>
            <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 1, color: C.tinta }}>NIVEL</Text>
            <Text style={{ fontSize: 26, fontWeight: "900", color: C.tinta, lineHeight: 28 }}>{nivel}</Text>
        </View>
    );
};

export default function PerfilUsuario() {
    const [nombre, setNombre] = useState("")
    const [correo, setCorreo] = useState("")
    const [mensaje, setMensaje] = useState("")
    const uid = auth.currentUser!.uid;

    const [usuario, setUsuario] = useState("");
    const [xp, setXp] = useState(0);
    const [racha, setRacha] = useState(0);
    const [rachaMe, setRachaMe] = useState(0);
    const [amigosN, setAmigosN] = useState(0);        // cuantos amigos tiene
    const [sesiones, setSesiones] = useState<sesion[]>([]);
    const [tareasL, setTareasL] = useState(0);        // tareas listas
    const [habitos, setHabitos] = useState(0);
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [ajustesV, setAjustesV] = useState(false);  // modal

    // useFocusEffect para que actualice
    useFocusEffect(
        useCallback(() => {
            const cargar = async () => {
                const snap = await getDoc(doc(db, "usuarios", uid));
                if (snap.exists()) {
                    const info = snap.data();
                    setCorreo(info.correo);
                    setNombre(info.nombre);
                    setUsuario(info.usuario ?? "");
                    setXp(info.xp ?? 0);
                    setRacha(rachaViva(info));
                    setRachaMe(info.rachaMe ?? 0);
                    setAmigosN((info.amigos ?? []).length);
                }
                const snapS = await getDocs(collection(db, "usuarios", uid, "sesion"));
                setSesiones(snapS.docs.map((d) => d.data() as sesion));

                const snapT = await getDocs(collection(db, "usuarios", uid, "tareas"));
                setTareasL(snapT.docs.filter((t) => t.data().listo).length);
                const snapR = await getDocs(collection(db, "usuarios", uid, "rutina"));
                setHabitos (snapR.docs.reduce((a, r) => a + (r.data().hechos ?? []).length, 0));
                const snapRa = await getDocs(collection(db, "usuarios", uid, "ramos"));
                setRamos(snapRa.docs.map((d) => ({ id: d.id, ...d.data() }) as ramo));
            };
            cargar();
        }, [])
    );

    const guardar = async () => {
        if (!nombre.trim()) return setMensaje("No puede quedar el nombre vacio");
        try {
            await updateDoc(doc(db, "usuarios", uid), {
                nombre: nombre.trim(),
            });
            setMensaje("Guardado");
        } catch (e: any) {
            setMensaje(e.code);
        }
    };

    const salir = async () => {
        await signOut(auth);
    };
    const probar = async () => {
        const ok = await probarNotificacion();
        setMensaje(ok ? "Notificación en 5 segundos..." : "No hay permiso para notificar");
    };

    // nivel
    const nivel = nivelDe(xp);
    const siguiente = nivel * XP_NIVEL;
    const avance = (xp - (nivel - 1) * XP_NIVEL) / XP_NIVEL;

    // rangois 
    const actualR = Math.min(nivel - 1, TITULOS.length - 1);
    const desdeR = Math.max(0, Math.min(actualR - 1, TITULOS.length - 4));
    const rangosV = TITULOS.slice(desdeR, desdeR + 4).map((t, i) => ({ titulo: t, nv: desdeR + i + 1 }));

    // semana
    const diasE = new Set(sesiones.map((s) => s.dia));
    const semana = semanaA();

    // numeros
    const minutosT = sesiones.reduce((a, s) => a + (s.minutos ?? 0), 0);
    const horaDe = (s: sesion) => (s.creado?.toDate ? s.creado.toDate().getHours() : -1);

    const horasR = ramos
        .map((r) => ({ ...r, min: sesiones.filter((s) => s.ramoId === r.id && s.dia >= semana[0]).reduce((a, s) => a + (s.minutos ?? 0), 0) }))
        .sort((a, b) => b.min - a.min);
    const maxR = Math.max(60, ...horasR.map((r) => r.min));
    const horasTxt = (min: number) => (min < 60 ? `${min} min` : `${(min / 60).toFixed(1).replace(".", ",").replace(",0", "")} h`);

    // insignias
    const insignias = [
        { nombre: "Primer pomodoro", gano: sesiones.length > 0, color: C.boton, forma: 999, icono: <IconoI nombre="timer" /> },
        { nombre: "Madrugador", gano: sesiones.some((s) => horaDe(s) >= 0 && horaDe(s) < 9), color: C.boton, forma: 999, icono: <IconoI nombre="sun" /> },
        { nombre: "en racha", gano: rachaMe >= 7, color: C.durazno, forma: 18, icono: <Text style={{ fontSize: 22, fontWeight: "900", color: C.tinta }}>{rachaMe}</Text> },
        { nombre: "Noctámbulo", gano: sesiones.some((s) => horaDe(s) >= 22), color: C.lila, forma: 999, icono: <IconoI nombre="moon" /> },
        { nombre: "10 horas", gano: minutosT >= 600, color: C.amarillo, forma: 18, icono: <IconoI nombre="alarm-clock" /> },
        { nombre: "Cumplidor", gano: tareasL >= 10, color: C.boton, forma: 18, icono: <IconoI nombre="circle-check" /> },
        { nombre: "Constante", gano: habitos >= 20, color: C.durazno, forma: 18, icono: <IconoI nombre="dumbbell" /> },
        { nombre: "Sociable", gano: amigosN > 0, color: C.lila, forma: 999, icono: <IconoI nombre="users" /> },
        { nombre: "Nivel 5", gano: nivel >= 5, color: C.amarillo, forma: 999, icono: <IconoI nombre="star" /> },
    ];
    const insigniasG = insignias.filter((i) => i.gano);

    return (
        <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: C.papel }}>
            {/* Fondo cuadriculado */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Pattern id="hojaP" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#hojaP)" />
            </Svg>

            <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 480, alignSelf: "center", padding: 20, paddingBottom: 24 }}>
                <View className="mb-4 flex-row items-center justify-between">
                    <Text style={{ fontSize: 28, fontWeight: "900", color: C.tinta }}>Tu progreso</Text>
                    <Pressable
                        onPress={() => { setMensaje(""); setAjustesV(true); }}
                        className="h-10 w-10 items-center justify-center rounded-xl border-2"
                        style={{ borderColor: C.tinta, backgroundColor: C.blanco }}
                    >
                        <IconoI nombre="settings" tam={22} />
                    </Pressable>
                </View>

                <ConSombra className="mb-6">
                    <View className="flex-row items-center gap-4 rounded-2xl border-2 p-4" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                        <Anillo nivel={nivel} avance={avance} />
                        <View className="flex-1">
                            <Text className="italic" style={{ color: C.verde }}>
                                {usuario || nombre} · {miles(xp)} / {miles(siguiente)} XP
                            </Text>
                            <Text style={{ fontSize: 20, fontWeight: "900", color: C.tinta }}>{tituloDe(nivel)}</Text>
                            <Text className="text-xs" style={{ color: C.gris }}>
                                {siguiente - xp} XP más y llegas al <Text className="font-bold" style={{ color: C.tinta }}>nivel {nivel + 1}</Text>.
                            </Text>
                        </View>
                    </View>
                </ConSombra>

                {/* Rangos */}
                <Text className="mb-3 text-xl" style={{ fontWeight: "900", color: C.tinta }}>Rangos</Text>
                <View className="mb-6 flex-row justify-between">
                    <View style={{ position: "absolute", top: 21, left: "12%", right: "12%", borderTopWidth: 2, borderStyle: "dashed", borderColor: C.verde }} />
                    {rangosV.map((r) => {
                        const paso = r.nv - 1 < actualR;
                        const aca = r.nv - 1 === actualR;
                        return (
                            <View key={r.nv} className="items-center" style={{ width: "25%" }}>
                                <View
                                    className="h-11 w-11 items-center justify-center rounded-full border-2"
                                    style={{
                                        borderColor: paso || aca ? C.tinta : C.gris,
                                        borderStyle: paso || aca ? "solid" : "dashed",
                                        backgroundColor: paso ? C.verde : aca ? C.boton : C.papel,
                                    }}
                                >
                                    {paso ? <IconoI nombre="check" tam={20} color={C.blanco} />
                                        : aca ? <Text style={{ fontWeight: "900", color: C.tinta }}>{nivel}</Text>
                                            : <IconoI nombre="lock" tam={18} color={C.gris} />}
                                </View>
                                <Text className="mt-1 text-center text-xs" style={{ fontWeight: "800", color: paso || aca ? C.tinta : C.gris }} numberOfLines={2}>{r.titulo}</Text>
                                <Text className="text-xs" style={{ color: aca ? C.verde : C.gris, fontWeight: aca ? "700" : "400" }}>{aca ? "estás acá" : `nv ${r.nv}`}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Racha */}
                <ConSombra className="mb-6">
                    <View className="rounded-2xl border-2 p-4" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                        <View className="mb-3 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-1">
                                <IconoI nombre="flame" tam={22} color={C.coral} />
                                <Text style={{ fontSize: 20, fontWeight: "900", color: C.tinta }}>{racha} {racha === 1 ? "día seguido" : "días seguidos"}</Text>
                            </View>
                            <Text className="text-xs" style={{ color: C.gris }}>récord: {rachaMe}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            {semana.map((dia, i) => {
                                const hecho = diasE.has(dia);
                                const esHoy = dia === hoy();
                                return (
                                    <View key={dia} className="items-center">
                                        <View
                                            className="h-9 w-9 items-center justify-center rounded-full border-2"
                                            style={{
                                                borderColor: hecho ? C.tinta : esHoy ? C.coral : C.gris,
                                                borderStyle: hecho || esHoy ? "solid" : "dashed",
                                                backgroundColor: hecho ? C.boton : esHoy ? C.durazno : "transparent",
                                            }}
                                        >
                                            {hecho ? <IconoI nombre="check" tam={18} />
                                                : esHoy ? <Text style={{ fontSize: 10, fontWeight: "800", color: C.coral }}>hoy</Text> : null}
                                        </View>
                                        <Text className="mt-1 text-xs font-bold" style={{ color: C.tinta }}>{DIAS_L[i]}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </ConSombra>

                {/* Numeros */}
                <View className="mb-6 flex-row gap-3">
                    {[
                        { valor: `${Math.floor(minutosT / 60)} h`, texto: "estudiadas" },
                        { valor: String(tareasL), texto: "tareas listas" },
                        { valor: corto(xp), texto: "XP total" },
                    ].map((n) => (
                        <ConSombra key={n.texto} className="flex-1" radio={14}>
                            <View className="rounded-2xl border-2 p-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                                <Text style={{ fontSize: 22, fontWeight: "900", color: C.tinta }}>{n.valor}</Text>
                                <Text className="text-xs" style={{ color: C.gris }}>{n.texto}</Text>
                            </View>
                        </ConSombra>
                    ))}
                </View>

                <Text className="mb-3 text-xl" style={{ fontWeight: "900", color: C.tinta }}>Horas por ramo esta semana</Text>
                <ConSombra className="mb-6">
                    <View className="rounded-2xl border-2 p-4" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                        {horasR.length === 0 && <Text style={{ color: C.gris }}>Aún no tienes ramos</Text>}
                        {horasR.map((r) => (
                            <View key={r.id} className="mb-3">
                                <View className="mb-1 flex-row justify-between">
                                    <Text className="font-bold" style={{ color: C.tinta }} numberOfLines={1}>{r.nombres}</Text>
                                    <Text className="text-xs" style={{ color: C.gris }}>{horasTxt(r.min)}</Text>
                                </View>
                                <View className="h-4 overflow-hidden rounded-full border-2" style={{ borderColor: C.tinta, backgroundColor: C.papel }}>
                                    <View style={{ width: `${(r.min / maxR) * 100}%`, height: "100%", backgroundColor: r.color }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </ConSombra>

                {/* Insignias */}
                <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-xl" style={{ fontWeight: "900", color: C.tinta }}>Insignias</Text>
                    <Text className="italic" style={{ color: C.verde }}>{insigniasG.length} de {insignias.length}</Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                    {insigniasG.map((i) => (
                        <View
                            key={i.nombre}
                            className="items-center justify-center border-2"
                            style={{ width: 76, height: 76, borderRadius: i.forma, borderColor: C.tinta, backgroundColor: i.color }}
                        >
                            {i.icono}
                            <Text className="mt-1 text-center" style={{ fontSize: 10, fontWeight: "800", color: C.tinta }} numberOfLines={2}>{i.nombre}</Text>
                        </View>
                    ))}
                    {insigniasG.length < insignias.length && (
                        <View
                            className="items-center justify-center border-2"
                            style={{ width: 76, height: 76, borderRadius: 18, borderStyle: "dashed", borderColor: C.gris, transform: [{ rotate: "4deg" }] }}
                        >
                            <Text style={{ fontSize: 20, fontWeight: "900", color: C.gris }}>???</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal visible={ajustesV} transparent animationType="fade" onRequestClose={() => setAjustesV(false)}>
                <Pressable className="flex-1 justify-center p-6" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setAjustesV(false)}>
                    <Pressable onPress={() => { }} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
                        <ConSombra>
                            <View className="rounded-2xl border-2 p-5" style={{ backgroundColor: C.papel, borderColor: C.tinta }}>
                                <View className="mb-4 flex-row items-center justify-between">
                                    <Text style={{ fontSize: 22, fontWeight: "900", color: C.tinta }}>Ajustes</Text>
                                    <Pressable onPress={() => setAjustesV(false)}>
                                        <IconoI nombre="x" tam={24} />
                                    </Pressable>
                                </View>

                                <Text className="mb-1 font-bold" style={{ color: C.tinta }}>Correo</Text>
                                <Text className="mb-4" style={{ color: C.gris }}>{correo}</Text>
                                <Text className="mb-1 font-bold" style={{ color: C.tinta }}>Nombre</Text>
                                <TextInput
                                    className="mb-4 rounded-xl border-2 p-3"
                                    style={{ borderColor: C.tinta, backgroundColor: C.blanco }}
                                    value={nombre}
                                    onChangeText={setNombre}
                                />

                                {mensaje !== "" && <Text className="mb-3" style={{ color: C.verde }}>{mensaje}</Text>}
                                <Pressable className="mb-3" onPress={guardar}>
                                    <ConSombra radio={14}>
                                        <View className="items-center rounded-2xl border-2 p-3" style={{ backgroundColor: C.boton, borderColor: C.tinta }}>
                                            <Text className="font-bold" style={{ color: C.tinta }}>Guardar cambios</Text>
                                        </View>
                                    </ConSombra>
                                </Pressable>

                                <Pressable className="mb-3" onPress={probar}>
                                    <View className="items-center rounded-2xl border-2 p-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                                        <Text className="font-bold" style={{ color: C.tinta }}>Probar notificación</Text>
                                    </View>
                                </Pressable>

                                <Pressable onPress={salir}>
                                    <View className="items-center rounded-2xl border-2 p-3" style={{ backgroundColor: C.durazno, borderColor: C.tinta }}>
                                        <Text className="font-bold" style={{ color: C.tinta }}>Cerrar sesión</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </ConSombra>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
