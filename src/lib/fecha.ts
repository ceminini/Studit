export const formateo =(d:Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hoy = () => formateo(new Date());

export const ayer = ()=>{
    const d =new Date();
    d.setDate(d.getDate()-1); //interpreta fin de mes solo
    return formateo(d);

};
