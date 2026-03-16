import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";
import imageCompression from "browser-image-compression";
import {
    ArrowLeft,
    ChevronRight,
    Loader2,
    X,
    Plus,
    Users,
    Lock,
    Unlock,
    Car,
    Shield,
    Wrench,
} from "lucide-react";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dy3kkwoli/image/upload";
const CLOUDINARY_PRESET = "vistorias_preset";

const COMPRESSION_OPTIONS = {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.6,
};

const uploadParaCloudinary = async (base64) => {
    const formData = new FormData();
    formData.append("file", base64);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    const res = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!data.secure_url) {
        throw new Error("Falha no upload da imagem");
    }

    return data.secure_url;
};

const Vistoria = ({ onBack, frotaInicial = [] }) => {
    const { user } = useAuth();

    const [step, setStep] = useState(1);
    const [uploadStatus, setUploadStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [viaturas, setViaturas] = useState(frotaInicial);
    const [efetivoLocal, setEfetivoLocal] = useState([]);

    const [tipoVistoria, setTipoVistoria] = useState("ENTRADA");

    const [fotos, setFotos] = useState([]);
    const [protegerFotos, setProtegerFotos] = useState(false);

    const [kmReferencia, setKmReferencia] = useState(0);

    const [formData, setFormData] = useState({
        prefixo_vtr: "",
        placa_vtr: "",
        hodometro: "",
        tipo_servico: "",
        servico_detalhe: "",
        motorista_re: "",
        motorista_nome: "",
        comandante_re: "",
        comandante_nome: "",
        patrulheiro_re: "",
        patrulheiro_nome: "",
        termo_aceite: false,
    });

    const [checklist, setChecklist] = useState({});

    const toStr = useCallback(
        (v) => (v !== undefined && v !== null ? String(v) : ""),
        []
    );

    const vtrSelecionada = useMemo(
        () =>
            viaturas.find(
                (v) =>
                    toStr(v.Prefixo || v.PREFIXO) ===
                    toStr(formData.prefixo_vtr)
            ),
        [formData.prefixo_vtr, viaturas, toStr]
    );

    const kmInvalido = useMemo(() => {
        const kmAtual = Number(formData.hodometro);
        const kmRef = Number(kmReferencia);

        if (!kmAtual) return false;

        if (kmAtual < kmRef) return true;

        if (tipoVistoria === "SAÍDA" && kmAtual <= kmRef) return true;

        return false;
    }, [formData.hodometro, kmReferencia, tipoVistoria]);

    const isFormIncompleto = useMemo(() => {
        return (
            !formData.prefixo_vtr ||
            !formData.hodometro ||
            !formData.motorista_nome ||
            !formData.comandante_nome ||
            kmInvalido
        );
    }, [formData, kmInvalido]);

    const handleVtrChange = (prefixo) => {
        const vtr = viaturas.find(
            (v) => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo)
        );

        if (!vtr) return;

        const ultKM = vtr.UltimoKM || vtr.ULTIMOKM || 0;

        setKmReferencia(Number(ultKM));

        setFormData((p) => ({
            ...p,
            prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO),
            placa_vtr: toStr(vtr.Placa || vtr.PLACA),
            hodometro: tipoVistoria === "SAÍDA" ? ultKM : "",
        }));
    };

    const handleFinalizar = async () => {
        if (loading) return;

        const temFalha = Object.values(checklist).includes("FALHA");

        if (temFalha && fotos.length === 0) {
            return alert("É obrigatório registrar fotos das falhas.");
        }

        if (!window.confirm("Deseja finalizar e enviar a vistoria?")) return;

        setLoading(true);
        setUploadStatus("Salvando dados...");

        try {
            const falhas = Object.entries(checklist)
                .filter(([_, s]) => s === "FALHA")
                .map(([i]) => i);

            const resumo =
                falhas.length === 0
                    ? "SEM ALTERAÇÕES"
                    : `FALHA EM: ${falhas.join(", ")}`;

            const payload = {
                ...formData,
                tipo_vistoria: tipoVistoria,
                checklist_resumo: resumo,
                proteger_ocorrencia: protegerFotos,
                militar_logado: `${user.patente} ${user.nome}`,
            };

            const res = await gasApi.saveVistoria(payload);

            if (res.status !== "success") {
                throw new Error("Erro ao salvar vistoria");
            }

            const idVistoria = res.id;

            if (fotos.length > 0) {
                let linksFotos = [];

                for (let i = 0; i < fotos.length; i++) {
                    setUploadStatus(
                        `Enviando foto ${i + 1} de ${fotos.length}...`
                    );

                    const link = await uploadParaCloudinary(fotos[i]);

                    linksFotos.push(link);
                }

                await gasApi.saveVistoria({
                    id_referencia: idVistoria,
                    links_fotos: linksFotos,
                });
            }

            setUploadStatus("Finalizado");

            alert("Vistoria enviada com sucesso!");

            onBack();
        } catch (e) {
            console.error(e);

            alert("Erro ao enviar vistoria.");
        } finally {
            setLoading(false);
            setUploadStatus("");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-10 text-slate-900">
            <header className="bg-slate-900 text-white p-5 flex justify-between items-center">
                <button onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>

                <div className="text-center">
                    <h1 className="text-[10px] uppercase">Vistoria</h1>
                    <p className="text-xs text-blue-400">{tipoVistoria}</p>
                </div>

                <div className="w-6" />
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-4">
                <select
                    value={formData.prefixo_vtr}
                    onChange={(e) => handleVtrChange(e.target.value)}
                    className="vtr-input w-full"
                >
                    <option value="">Selecione a VTR</option>

                    {(tipoVistoria === "ENTRADA"
                        ? viaturas.filter((v) =>
                              String(v.Status || v.STATUS)
                                  .toUpperCase()
                                  .includes("DISPON")
                          )
                        : viaturas.filter((v) =>
                              String(v.Status || v.STATUS)
                                  .toUpperCase()
                                  .includes("EM SERV")
                          )
                    ).map((v) => (
                        <option key={v.Prefixo || v.PREFIXO}>
                            {v.Prefixo || v.PREFIXO}
                        </option>
                    ))}
                </select>

                <input
                    type="number"
                    className={`vtr-input w-full ${
                        kmInvalido ? "border-red-500" : ""
                    }`}
                    placeholder="KM"
                    value={formData.hodometro}
                    onChange={(e) =>
                        setFormData({ ...formData, hodometro: e.target.value })
                    }
                />

                <div className="grid grid-cols-4 gap-2">
                    {fotos.map((f, i) => (
                        <div key={i} className="relative aspect-square">
                            <img
                                src={f}
                                className="object-cover w-full h-full"
                            />
                            <button
                                onClick={() =>
                                    setFotos((p) => p.filter((_, x) => x !== i))
                                }
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}

                    {fotos.length < 4 && (
                        <label className="border-2 border-dashed flex items-center justify-center">
                            {uploading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Plus />
                            )}

                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files[0];

                                    if (!file) return;

                                    setUploading(true);

                                    try {
                                        const compressed = await imageCompression(
                                            file,
                                            COMPRESSION_OPTIONS
                                        );

                                        const reader = new FileReader();

                                        reader.readAsDataURL(compressed);

                                        reader.onloadend = () => {
                                            setFotos((p) => [
                                                ...p,
                                                reader.result,
                                            ]);

                                            setUploading(false);
                                        };
                                    } catch (err) {
                                        console.error(err);

                                        setUploading(false);
                                    }
                                }}
                            />
                        </label>
                    )}
                </div>

                <label className="flex gap-3">
                    <input
                        type="checkbox"
                        checked={formData.termo_aceite}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                termo_aceite: e.target.checked,
                            })
                        }
                    />

                    <span className="text-[10px] font-bold uppercase">
                        EU, {formData.motorista_nome || "MOTORISTA"}, DECLARO
                        QUE REALIZEI A VISTORIA DA VIATURA{" "}
                        {formData.prefixo_vtr}. CONFIRMO QUE AS INFORMAÇÕES SÃO
                        VERDADEIRAS E ESTOU CIENTE QUE A OMISSÃO OU PRESTAÇÃO DE
                        INFORMAÇÃO FALSA PODE CARACTERIZAR INFRAÇÃO DISCIPLINAR
                        OU CRIME MILITAR.
                    </span>
                </label>

                <button
                    onClick={handleFinalizar}
                    disabled={!formData.termo_aceite || loading}
                    className="btn-tatico w-full"
                >
                    {loading ? (
                        <div>
                            <Loader2 className="animate-spin mx-auto" />
                            <div className="text-[10px]">{uploadStatus}</div>
                        </div>
                    ) : (
                        "FINALIZAR"
                    )}
                </button>
            </main>
        </div>
    );
};

export default Vistoria;
