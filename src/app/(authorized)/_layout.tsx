import { Tabs } from "expo-router/js-tabs";
import { View } from "react-native";
import { Text } from "@/components/Texto";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { C } from "@/lib/colores";


// iconos dibujados con svg 
const trazo = { fill: "none", stroke: C.tinta, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONOS: Record<string, React.ReactNode> = {
    inicio: (
        <>
            <Path d="M3 10 L12 3 L21 10 V20 A1 1 0 0 1 20 21 H4 A1 1 0 0 1 3 20 Z" {...trazo} />
            <Path d="M9 21 V13 H15 V21" {...trazo} />
        </>
    ),
    materias: (
        <>
            <Path d="M12 6 C10 4.5 7 4 3 4.5 V19 C7 18.5 10 19 12 20.5 C14 19 17 18.5 21 19 V4.5 C17 4 14 4.5 12 6 Z" {...trazo} />
            <Path d="M12 6 V20.5" {...trazo} />
        </>
    ),
    pomodoro: (
        <>
            <Circle cx={12} cy={14} r={7} {...trazo} />
            <Path d="M10 2 H14 M12 14 L14.5 11.5" {...trazo} />
        </>
    ),
    tareas: (
        <>
            <Rect x={3} y={5} width={18} height={16} rx={2} {...trazo} />
            <Path d="M3 10 H21 M8 3 V7 M16 3 V7" {...trazo} />
        </>
    ),
    amigos: (
        <>
            <Circle cx={9} cy={8} r={4} {...trazo} />
            <Path d="M2 21 C2 17 5 15 9 15 C13 15 16 17 16 21 M16 4.2 A4 4 0 0 1 16 11.8 M22 21 C22 18 20.5 16 18 15.4" {...trazo} />
        </>
    ),
    perfilUsuario: (
        <>
            <Circle cx={12} cy={8} r={4.5} {...trazo} />
            <Path d="M4 21 C4 16.5 7.5 14 12 14 C16.5 14 20 16.5 20 21" {...trazo} />
        </>
    ),
};

const Icono = ({ nombre, activo }: { nombre: string; activo: boolean }) => (
    <View
        style={{
            width: 46,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            borderWidth: 2,
            borderColor: activo ? C.tinta : "transparent",
            backgroundColor: activo ? C.boton : "transparent",
        }}
    >
        <Svg width={26} height={26} viewBox="0 0 24 24">{ICONOS[nombre]}</Svg>
    </View>
);

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused }) => <Icono nombre={route.name} activo={focused} />,
                tabBarIconStyle: { width: 46, height: 32 },
                tabBarLabel: ({ focused, children }) => (
                    <Text style={{ fontSize: 12, marginTop: 4, color: C.tinta, fontWeight: focused ? "800" : "500" }}>{children}</Text>
                ),
                tabBarStyle: {
                    backgroundColor: C.papel,
                    borderTopWidth: 2,
                    borderTopColor: C.tinta,
                    height: 64 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: insets.bottom,
                },
            })}
        >
            <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
            <Tabs.Screen name="materias" options={{ title: "Ramos" }} />
            <Tabs.Screen name="pomodoro" options={{ title: "Pomodoro" }} />
            <Tabs.Screen name="tareas" options={{ title: "Agenda" }} />
            <Tabs.Screen name="amigos" options={{ title: "Amigos" }} />
            <Tabs.Screen name="perfilUsuario" options={{ title: "Perfil" }} />
        </Tabs>
    );
}
