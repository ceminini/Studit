import { StyleSheet, Text as TextRN, TextInput as InputRN, TextInputProps, TextProps } from "react-native";

export const FUENTES = {
    Nunito_400Regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    Nunito_400Regular_Italic: require("@expo-google-fonts/nunito/400Regular_Italic/Nunito_400Regular_Italic.ttf"),
    Nunito_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    Nunito_700Bold_Italic: require("@expo-google-fonts/nunito/700Bold_Italic/Nunito_700Bold_Italic.ttf"),
    Nunito_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
    Nunito_900Black: require("@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf"),
};

const elegirF = (style: any, className = "") => {
    const estiloP = StyleSheet.flatten(style) ?? {};
    const pesoF = String(estiloP.fontWeight ?? (className.includes("font-bold") ? "700" : "400"));
    const italicaF = estiloP.fontStyle === "italic" || className.includes("italic");

    let fuenteE = italicaF ? "Nunito_400Regular_Italic" : "Nunito_400Regular";
    if (pesoF === "700" || pesoF === "bold") fuenteE = italicaF ? "Nunito_700Bold_Italic" : "Nunito_700Bold";
    if (pesoF === "800") fuenteE = "Nunito_800ExtraBold";
    if (pesoF === "900") fuenteE = "Nunito_900Black";

    return { fontFamily: fuenteE, fontWeight: "normal" as const, fontStyle: "normal" as const };
};

export function Text({ style, className, ...props }: TextProps & { className?: string }) {
    return <TextRN {...props} className={className} style={[style, elegirF(style, className)]} />;
}

export function TextInput({ style, className, ...props }: TextInputProps & { className?: string }) {
    return <InputRN {...props} className={className} style={[style, elegirF(style, className)]} />;
}
