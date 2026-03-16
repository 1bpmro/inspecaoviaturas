import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";
import imageCompression from "browser-image-compression";

import {
ArrowLeft,
Loader2,
X,
Plus
} from "lucide-react";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dy3kkwoli/image/upload";
const CLOUDINARY_PRESET = "vistorias_preset";

const MAX_FOTOS = 6;

const COMPRESSION_OPTIONS = {
maxSizeMB: 0.05,
maxWidthOrHeight: 900,
useWebWorker: true,
fileType: "image/jpeg",
initialQuality: 0.6
};

const uploadParaCloudinary = async (base64,prefixo,tipo,km,index)=>{

const hoje = new Date().toISOString().slice(0,10);

const nome = `${prefixo}_${tipo}_KM${km}_${index+1}`;

const pasta = `vistorias/1BPM/${prefixo}/${hoje}`;

const fd = new FormData();

fd.append("file",base64);
fd.append("upload_preset",CLOUDINARY_PRESET);
fd.append("folder",pasta);
fd.append("public_id",nome);

const res = await fetch(CLOUDINARY_URL,{
method:"POST",
body:fd
});

const data = await res.json();

if(!data.secure_url) throw new Error("Erro upload");

return data.secure_url;

};

const Vistoria = ({ onBack, frotaInicial=[] })=>{

const { user } = useAuth();

const [loading,setLoading] = useState(false);
const [uploading,setUploading] = useState(false);
const [uploadStatus,setUploadStatus] = useState("");

const [viaturas,setViaturas] = useState(frotaInicial);
const [efetivoLocal,setEfetivoLocal] = useState([]);

const [tipoVistoria,setTipoVistoria] = useState("ENTRADA");

const [fotos,setFotos] = useState([]);

const [kmReferencia,setKmReferencia] = useState(0);

const [formData,setFormData] = useState({
prefixo_vtr:"",
placa_vtr:"",
hodometro:"",
motorista_nome:"",
comandante_nome:"",
termo_aceite:false
});

const toStr = useCallback((v)=> v ? String(v) : "",[]);

useEffect(()=>{

const carregar = async ()=>{

try{

const [resVtr,resMil] = await Promise.all([
gasApi.getViaturas(),
gasApi.getEfetivoCompleto()
]);

if(resVtr?.status==="success") setViaturas(resVtr.data);
if(resMil?.status==="success") setEfetivoLocal(resMil.data);

}catch(e){
console.error(e);
}

};

carregar();

},[]);

const handleVtrChange=(prefixo)=>{

const vtr = viaturas.find(
v=>toStr(v.Prefixo||v.PREFIXO)===toStr(prefixo)
);

if(!vtr) return;

const ultKM = vtr.UltimoKM || vtr.ULTIMOKM || 0;

setKmReferencia(Number(ultKM));

setFormData(p=>({
...p,
prefixo_vtr:toStr(vtr.Prefixo||vtr.PREFIXO),
placa_vtr:toStr(vtr.Placa||vtr.PLACA),
hodometro: tipoVistoria==="SAÍDA" ? ultKM : ""
}));

};

const kmInvalido = useMemo(()=>{

const km = Number(formData.hodometro);
const ref = Number(kmReferencia);

if(!km) return false;

if(km < ref) return true;

if(tipoVistoria==="SAÍDA" && km<=ref) return true;

if(km - ref > 2000) return true;

return false;

},[formData.hodometro,kmReferencia,tipoVistoria]);

const adicionarFoto = async(file)=>{

setUploading(true);

try{

const compressed = await imageCompression(file,COMPRESSION_OPTIONS);

const reader = new FileReader();

reader.readAsDataURL(compressed);

reader.onloadend = ()=>{

setFotos(p=>[...p,reader.result]);

setUploading(false);

};

}catch(e){

console.error(e);
setUploading(false);

}

};

const removerFoto=(index)=>{

setFotos(p=>p.filter((_,i)=>i!==index));

};

const handleFinalizar = async ()=>{

if(loading) return;

if(kmInvalido){
return alert("KM inválido.");
}

if(!formData.prefixo_vtr || !formData.hodometro){
return alert("Preencha os campos obrigatórios.");
}

if(!formData.termo_aceite){
return alert("Aceite o termo.");
}

if(!window.confirm("Finalizar vistoria?")) return;

setLoading(true);

try{

setUploadStatus("Salvando vistoria...");

const payload = {
...formData,
tipo_vistoria:tipoVistoria,
militar_logado:`${user.patente} ${user.nome}`
};

const res = await gasApi.saveVistoria(payload);

if(res.status!=="success") throw new Error("Erro salvar");

const id = res.id;

if(fotos.length){

let links=[];

for(let i=0;i<fotos.length;i++){

setUploadStatus(`Upload foto ${i+1}/${fotos.length}`);

const link = await uploadParaCloudinary(
fotos[i],
formData.prefixo_vtr,
tipoVistoria,
formData.hodometro,
i
);

links.push(link);

}

await gasApi.saveVistoria({
id_referencia:id,
links_fotos:links
});

}

alert("Vistoria enviada!");

onBack();

}catch(e){

console.error(e);

alert("Erro envio.");

}finally{

setLoading(false);
setUploadStatus("");

}

};

return(

<div className="min-h-screen bg-slate-50 pb-10">

<header className="bg-slate-900 text-white p-5 flex justify-between">

<button onClick={onBack}>
<ArrowLeft/>
</button>

<div className="text-center">

<h1 className="text-xs uppercase">Vistoria</h1>

<p className="text-blue-400 text-[10px]">{tipoVistoria}</p>

</div>

<div/>

</header>

<main className="max-w-xl mx-auto p-4 space-y-4">

<select
className="vtr-input w-full"
value={formData.prefixo_vtr}
onChange={(e)=>handleVtrChange(e.target.value)}
>

<option value="">Selecione VTR</option>

{(tipoVistoria==="ENTRADA"
? viaturas.filter(v=>String(v.Status||v.STATUS).toUpperCase().includes("DISPON"))
: viaturas.filter(v=>String(v.Status||v.STATUS).toUpperCase().includes("EM SERV"))
).map(v=>(
<option key={v.Prefixo||v.PREFIXO}>
{v.Prefixo||v.PREFIXO}
</option>
))}

</select>

<input
type="number"
className={`vtr-input w-full ${kmInvalido ? "border-red-500":""}`}
placeholder="KM"
value={formData.hodometro}
onChange={(e)=>setFormData({...formData,hodometro:e.target.value})}
/>

<div className="grid grid-cols-3 gap-2">

{fotos.map((f,i)=>(

<div key={i} className="relative aspect-square">

<img src={f} className="object-cover w-full h-full"/>

<button
onClick={()=>removerFoto(i)}
className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
>
<X size={12}/>
</button>

</div>

))}

{fotos.length<MAX_FOTOS &&(

<label className="border-2 border-dashed flex items-center justify-center text-sm">

{uploading
? <Loader2 className="animate-spin"/>
: <Plus/>}

<input
type="file"
hidden
accept="image/*"
onChange={(e)=>{

const file = e.target.files[0];

if(file) adicionarFoto(file);

}}
/>

</label>

)}

</div>

<div className="text-xs text-gray-500">
{fotos.length}/{MAX_FOTOS} fotos
</div>

<label className="flex gap-2 text-[10px] font-bold uppercase">

<input
type="checkbox"
checked={formData.termo_aceite}
onChange={(e)=>setFormData({...formData,termo_aceite:e.target.checked})}
/>

<span>

EU, {formData.motorista_nome || "MOTORISTA"}, DECLARO QUE REALIZEI A
VISTORIA DA VIATURA {formData.prefixo_vtr} E QUE AS INFORMAÇÕES
PRESTADAS SÃO VERDADEIRAS.

</span>

</label>

<button
onClick={handleFinalizar}
disabled={loading}
className="btn-tatico w-full"
>

{loading
? <>
<Loader2 className="animate-spin mx-auto"/>
<div className="text-[10px]">{uploadStatus}</div>
</>
: "FINALIZAR"}

</button>

</main>

</div>

);

};

export default Vistoria;
