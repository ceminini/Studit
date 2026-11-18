import { StyleSheet, Text as TextoRN, TextInput as CampoRN, TextInputProps, TextProps } from "react-native";

export const FUENTES = {
    Nunito_400Regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    Nunito_400Regular_Italic: require("@expo-google-fonts/nunito/400Regular_Italic/Nunito_400Regular_Italic.ttf"),
    Nunito_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    Nunito_700Bold_Italic: require("@expo-google-fonts/nunito/700Bold_Italic/Nunito_700Bold_Italic.ttf"),
    Nunito_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
    Nunito_900Black: require("@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf"),
};

const fuenteDe = (style: any, className = "") => {
    const plano = StyleSheet.flatten(style) ?? {};
    const peso = String(plano.fontWeight ?? (className.includes("font-bold") ? "700" : "400"));
    const italica = plano.fontStyle === "italic" || className.includes("italic");
    const nombre =
        peso === "900" ? "Nunito_900Black"
            : peso === "800" ? "Nunito_800ExtraBold"
                : peso === "700" || peso === "bold" ? (italica ? "Nunito_700Bold_Italic" : "Nunito_700Bold")
                    : italica ? "Nunito_400Regular_Italic" : "Nunito_400Regular";
    return { fontFamily: nombre, fontWeight: "normal" as const, fontStyle: "normal" as const };
};

export function Text({ style, className, ...resto }: TextProps & { className?: string }) {
    return <TextoRN {...resto} className={className} style={[style, fuenteDe(style, className)]} />;
}

export function TextInput({ style, className, ...resto }: TextInputProps & { className?: string }) {
    return <CampoRN {...resto} className={className} style={[style, fuenteDe(style, className)]} />;
}
