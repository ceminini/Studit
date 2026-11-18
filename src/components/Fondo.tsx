import { StyleSheet } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { C } from "@/lib/colores";

export default function Fondo() {
    return (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
                <Pattern id="cuadrosF" width={26} height={26} patternUnits="userSpaceOnUse">
                    <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cuadrosF)" />
        </Svg>
    );
}
