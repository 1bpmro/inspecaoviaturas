import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";
import imageCompression from "browser-image-compression";

import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

import { ArrowLeft, Loader2, X, Plus, ChevronRight, Car, Shield } from "lucide-react";

const MAX_FOTOS = 6;

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dy3kkwoli/image/upload";
const CLOUDINARY_PRESET = "vistorias_preset";

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

/* ---------- CHECKLIST ---------- */

const GRUPOS_ENTRADA = [
  {
    nome:"Documentação",
    icon:<Shield size={16}/>,
    itens:["Documento","Estepe","Triângulo","Extintor"]
  },
  {
    nome:"Estado Geral",
    icon:<Car size={16}/>,
    itens:["Pneus","Capô","Vidros","Portas"]
  }
];

/* ---------- COMPONENTE ---------- */

const Vistoria = ({ onBack })=>{

const { user } = useAuth();

const [step,setStep] = useState(1);
const [loading,setLoading] = useState(false);
const [uploading,setUploading] = useState(false);

const [uploadStatus,setUploadStatus] = useState("");
const [modalComunitaria,setModalComunitaria] = useState(false);

const [viaturas,setViaturas] = useState([]);
const [tipoVistoria,setTipoVistoria] = useState("ENTRADA");

const [fotos,setFotos] = useState([]);
const [checklist,setChecklist] = useState({});
const [kmReferencia,setKmReferencia] = useState(0);

const [formData,setFormData] = useState({
prefixo_vtr:"",
placa_vtr:"",
hodometro:"",
motorista_re:"",
motorista_nome:"",
comandante_re:"",
comandante_nome:"",
patrulheiro_re:"",
patrulheiro_nome:"",
termo_aceite:false
});

/* ---------- LOAD ---------- */

useEffect(()=>{
(async()=>{
try{
const res = await gasApi.getViaturas();
if(res?.status==="success") setViaturas(res.data);
}catch(e){ console.error(e); }
})();
},[]);

/* ---------- UTILS ---------- */

const toStr = (v)=> v ? String(v) : "";

const viaturasFiltradas = useMemo(()=>{
return (viaturas||[])
.sort((a,b)=>{
const pa = toStr(a.PREFIXO||a.Prefixo);
const pb = toStr(b.PREFIXO||b.Prefixo);
return pa.localeCompare(pb);
});
},[viaturas]);

const findVtr = (prefixo)=>{
return viaturas.find(v=>{
return toStr(v.PREFIXO||v.Prefixo)===prefixo;
});
};

/* ---------- VTR ---------- */

const handleVtrChange=(prefixo)=>{

const vtr = findVtr(prefixo);

if(!vtr){
setFormData(p=>({...p,prefixo_vtr:"",placa_vtr:""}));
return;
}

const placa = toStr(vtr.PLACA||vtr.Placa);
const km = vtr.ULTIMOKM||vtr.UltimoKM||0;

setKmReferencia(Number(km));

setFormData(p=>({
...p,
prefixo_vtr:prefixo,
placa_vtr:placa,
hodometro: tipoVistoria==="SAÍDA" ? km : ""
}));
};

/* ---------- KM ---------- */

const kmInvalido = useMemo(()=>{
const km = Number(formData.hodometro);
if(!km) return false;
if(km < kmReferencia) return true;
if(tipoVistoria==="SAÍDA" && km<=kmReferencia) return true;
return false;
},[formData.hodometro,kmReferencia,tipoVistoria]);

/* ---------- FOTO ---------- */

const adicionarFoto = async(file)=>{
setUploading(true);
try{
const compressed = await imageCompression(file,{maxSizeMB:0.05});
const reader = new FileReader();
reader.onloadend=()=> setFotos(p=>[...p,reader.result]);
reader.readAsDataURL(compressed);
}catch(e){console.error(e);}
setUploading(false);
};

const removerFoto=(i)=> setFotos(p=>p.filter((_,x)=>x!==i));

/* ---------- FINAL ---------- */

const handleFinalizar = async ()=>{

if(kmInvalido) return alert("KM inválido");
if(!formData.termo_aceite) return alert("Aceite o termo");

setLoading(true);

try{

setUploadStatus("Salvando vistoria...");

const payload = {
...formData,
tipo_vistoria:tipoVistoria,
checklist:JSON.stringify(checklist),
militar_logado:`${user.patente} ${user.nome}`
};

const res = await gasApi.saveVistoria(payload);

if(res.status!=="success") throw new Error();

const id = res.id;

/* 🔥 UPLOAD DAS FOTOS */
if(fotos.length){

let links=[];

for(let i=0;i<fotos.length;i++){

setUploadStatus(`Upload ${i+1}/${fotos.length}`);

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
alert("Erro envio");

}finally{

setLoading(false);
setUploadStatus("");

}
};

/* ---------- TERMO ---------- */

const termo = tipoVistoria==="ENTRADA"
? `EU, ${formData.motorista_nome||"MOTORISTA"}, DECLARO QUE RECEBI A VIATURA ${formData.prefixo_vtr} E ESTOU CIENTE DAS CONDIÇÕES.`
: `EU, ${formData.motorista_nome||"MOTORISTA"}, DECLARO QUE DEVOLVO A VIATURA ${formData.prefixo_vtr} E INFORMEI TODAS AS ALTERAÇÕES.`;

/* ---------- UI ---------- */

return(
<div className="min-h-screen bg-slate-50">

<header className="bg-slate-900 text-white p-4 flex justify-between">
<button onClick={onBack}><ArrowLeft/></button>
<div className="text-center text-xs">
VISTORIA<br/>{tipoVistoria}
</div>
<div/>
</header>

<main className="p-4 space-y-4">

{/* STEP 1 */}
{step===1 &&(
<>

<CardGuarnicao formData={formData}/>

<select className="vtr-input w-full"
value={formData.prefixo_vtr}
onChange={(e)=>handleVtrChange(e.target.value)}>
<option value="">Selecione VTR</option>
{viaturasFiltradas.map((v,i)=>{
const p = toStr(v.PREFIXO||v.Prefixo);
return <option key={i}>{p}</option>;
})}
</select>

<input placeholder="KM" type="number"
className="vtr-input w-full"
value={formData.hodometro}
onChange={(e)=>setFormData({...formData,hodometro:e.target.value})}
/>

<input placeholder="RE MOTORISTA"
className="vtr-input w-full"
onChange={(e)=>setFormData({...formData,motorista_re:e.target.value})}
/>

<input placeholder="RE COMANDANTE"
className="vtr-input w-full"
onChange={(e)=>setFormData({...formData,comandante_re:e.target.value})}
/>

<input placeholder="RE PATRULHEIRO"
className="vtr-input w-full"
onChange={(e)=>setFormData({...formData,patrulheiro_re:e.target.value})}
/>

<button
onClick={()=>setModalComunitaria(true)}
className="btn-secundario w-full"
>
MODALIDADE COMUNITÁRIA
</button>

<button onClick={()=>setStep(2)} className="btn-tatico w-full">
CHECKLIST <ChevronRight/>
</button>

</>
)}

{/* STEP 2 */}
{step===2 &&(
<>

<CardGuarnicao formData={formData} compacto/>

<div className="grid grid-cols-3 gap-2">
{fotos.map((f,i)=>(
<div key={i} className="relative">
<img src={f}/>
<button onClick={()=>removerFoto(i)}><X/></button>
</div>
))}
<label>
<input type="file" hidden onChange={(e)=>adicionarFoto(e.target.files[0])}/>
<Plus/>
</label>
</div>

{GRUPOS_ENTRADA.map(g=>(
<ChecklistGrupo
key={g.nome}
titulo={g.nome}
itens={g.itens}
checklist={checklist}
onToggle={(item)=>setChecklist(p=>({
...p,
[item]:p[item]==="FALHA"?"OK":"FALHA"
}))}
/>
))}

<label>
<input type="checkbox"
checked={formData.termo_aceite}
onChange={(e)=>setFormData({...formData,termo_aceite:e.target.checked})}/>
{termo}
</label>

<button onClick={handleFinalizar} className="btn-tatico w-full">
{loading ? (
<>
<Loader2 className="animate-spin mx-auto"/>
<div className="text-[10px]">{uploadStatus}</div>
</>
) : "FINALIZAR"}
</button>

<button onClick={()=>setStep(1)}>VOLTAR</button>

</>

  <ModalComunitaria
isOpen={modalComunitaria}
onClose={()=>setModalComunitaria(false)}
onSelect={(valor)=>{
setFormData(p=>({...p,modalidade:valor}));
setModalComunitaria(false);
}}
/>
  
)}

</main>
</div>
);
};

export default Vistoria;
