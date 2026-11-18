import { subida, tituloDe, XP_NIVEL } from "@/lib/nivel";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Texto";
import Svg, { Polygon } from "react-native-svg";
import { C as paleta } from "@/lib/colores";

const C = { ...paleta, fondo: "#BDE9E2", rayo: paleta.boton };

const RAYOS = 18;
const rayos = Array.from({ length: RAYOS }, (_, i) => {
    const a1 = (i / RAYOS) * 2 * Math.PI;
    const a2 = ((i + 0.5) / RAYOS) * 2 * Math.PI;
    const punto = (a: number) => `${50 + Math.cos(a) * 150},${38 + Math.sin(a) * 150}`;
    return `50,38 ${punto(a1)} ${punto(a2)}`;
});

// color alrededor del circulo
const PAPELES = [
    { top: "6%", left: "52%", color: C.blanco, giro: "20deg" },
    { top: "11%", left: "10%", color: C.coral, giro: "-25deg" },
    { top: "14%", left: "84%", color: C.lila, giro: "30deg" },
    { top: "33%", left: "86%", color: C.coral, giro: "-35deg" },
    { top: "36%", left: "14%", color: C.durazno, giro: "15deg" },
] as const;

type props = { datos: subida | null; onCerrar: () => void };

export default function SubioNivel({ datos, onCerrar }: props) {
    if (!datos) return null;
    const { nivel, nombre } = datos;

    const verProgreso = () => {
        onCerrar();
        router.push("/inicio");
    };

    return (
        <Modal visible transparent={false} animationType="fade" onRequestClose={onCerrar}>
            <View className="flex-1" style={{ backgroundColor: C.fondo }}>
                {/* Fondo con rayos */}
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
                    {rayos.map((p, i) => (
                        <Polygon key={i} points={p} fill={C.rayo} />
                    ))}
                </Svg>

                {PAPELES.map((p, i) => (
                    <View
                        key={i}
                        className="absolute rounded"
                        style={{ top: p.top, left: p.left, width: 16, height: 12, backgroundColor: p.color, borderWidth: 1.5, borderColor: C.tinta, transform: [{ rotate: p.giro }] }}
                    />
                ))}

                <View className="flex-1 justify-between px-6 pb-10 pt-16" style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
                    <View className="items-center">
                        <Text className="mb-2 text-2xl" style={{ fontWeight: "800", color: C.verde }}>
                            ¡bien ahí{nombre ? `, ${nombre}` : ""}!
                        </Text>
                        <Text className="mb-6 text-2xl" style={{ fontWeight: "900", color: C.tinta, letterSpacing: 3 }}>SUBISTE AL</Text>

                        {/* Circulo con el nivel */}
                        <View className="items-center justify-center rounded-full" style={{ width: 210, height: 210, backgroundColor: "rgba(255,255,255,0.45)" }}>
                            <View className="items-center justify-center rounded-full" style={{ width: 180, height: 180, backgroundColor: C.blanco, borderWidth: 2, borderColor: C.tinta }}>
                                <Text style={{ fontWeight: "800", color: C.verde, letterSpacing: 3 }}>NIVEL</Text>
                                <Text style={{ fontSize: 88, lineHeight: 96, fontWeight: "900", color: C.coral, textShadowColor: C.tinta, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }}>
                                    {nivel}
                                </Text>
                            </View>
                        </View>

                        <Text className="mt-8 text-center text-lg" style={{ color: C.tinta }}>
                            Ahora eres <Text style={{ fontWeight: "900" }}>{tituloDe(nivel)}</Text>
                        </Text>
                        <Text className="mt-1 text-center" style={{ color: C.gris }}>
                            {XP_NIVEL} XP más para el nivel {nivel + 1}
                        </Text>
                    </View>

                    <View>
                        {/* Boton turquesa */}
                        <View>
                            <View className="absolute left-0 right-0 rounded-2xl" style={{ top: 5, bottom: -5, backgroundColor: C.tinta }} />
                            <Pressable onPress={onCerrar}>
                                {({ pressed }) => (
                                    <View style={{ backgroundColor: C.verde, borderWidth: 1.5, borderColor: C.tinta, borderRadius: 16, paddingVertical: 18, alignItems: "center", transform: [{ translateY: pressed ? 4 : 0 }] }}>
                                        <Text className="text-lg" style={{ fontWeight: "900", color: C.blanco }}>Seguir estudiando</Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>

                        <Pressable className="mt-6" onPress={verProgreso}>
                            <Text className="text-center text-base underline" style={{ fontWeight: "800", color: C.tinta }}>Ver mi progreso</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
