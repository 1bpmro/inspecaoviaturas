import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Lock, Unlock, Car, Shield, Wrench 
} from 'lucide-react';

// --- CONFIGURAÇÃO E CONSTANTES ---
const GRUPOS_ENTRADA = [
  {
    nome: "Documentação e Equipamentos",
    icon: <Shield size={16} />,
    itens: ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Giroscópio", "Sirene", "Rádio"]
  },
  {
    nome: "Estado Externo",
    icon: <Car size={16} />,
    itens: ["Pneus", "Capô", "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Maçanetas", "Para-brisas", "Protetor Dianteiro"]
  },
  {
    nome: "Interior e Conforto",
    icon: <Users size={16} />,
    itens: ["Cinto", "Retrovisor Interno", "Painel de Instrumentos", "Bancos", "Forro Interno", "Tapetes", "Regulador dos Bancos", "Porta Traseira", "Porta Dianteira"]
  },
  {
    nome: "Mecânica Básica",
    icon: <Wrench size={16} />,
    itens: ["Nível de Água"]
  }
];

const MAPA_FALHAS_SAIDA = {
  "Viatura Entregue Limpa": "VIATURA ENTREGUE SUJA",
  "Viatura em Condições de Uso": "VIATURA SEM CONDIÇÕES DE USO",
  "Avarias Constatadas": "AVARIAS CONSTATADAS",
  "Limpeza Interna": "SEM LIMPEZA INTERNA",
  "Limpeza Externa": "SEM LIMPEZA EXTERNA",
  "Pertences da Guarnição Retirados": "ENCONTRADO PERTENCES DA GUARNIÇÃO"
};

const ITENS_SAIDA = Object.keys(MAPA_FALHAS_SAIDA);
const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];
const OPCOES_COMUNITARIA = ["Patrulha Comercial", "Base Móvel", "Patrulha Escolar"];

const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState(frotaInicial);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const [protegerFotos, setProtegerFotos] = useState(false);
  const [kmReferencia, setKmReferencia] = useState(0);
  const [modalOleoOpen, setModalOleoOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', 
    tipo_servico: '', servico_detalhe: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  // --- CORREÇÃO: LAZY INITIALIZATION DO CHECKLIST ---
  const [checklist, setChecklist] = useState(() => {
    const itensIniciais = tipoVistoria === 'ENTRADA' 
      ? GRUPOS_ENTRADA.flatMap(g => g.itens) 
      : ITENS_SAIDA;
    return itensIniciais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
  });

  // Função para trocar o tipo de vistoria e resetar o checklist simultaneamente
  const alterarTipoVistoria = (tipo) => {
    setTipoVistoria(tipo);
    const novosItens = tipo === 'ENTRADA' 
      ? GRUPOS_ENTRADA.flatMap(g => g.itens) 
      : ITENS_SAIDA;
    setChecklist(novosItens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
    
    // Opcional: Limpar prefixo selecionado ao trocar tipo para evitar erros de KM
    setFormData(prev => ({ ...prev, prefixo_vtr: '', hodometro: '' }));
  };

  const toStr = useCallback((val) => (val !== undefined && val !== null ? String(val) : ''), []);

  const viaturasFiltradas = useMemo(() => {
    return tipoVistoria === 'ENTRADA' 
      ? viaturas.filter(v => v.Status !== 'EM SERVIÇO' && v.Status !== 'FORA DE SERVIÇO (BAIXA)')
      : viaturas.filter(v => v.Status === 'EM SERVIÇO');
  }, [viaturas, tipoVistoria]);

  const temAvaria = useMemo(() => Object.values(checklist).includes('FALHA'), [checklist]);

  const kmInvalido = useMemo(() => {
    const kmAtual = Number(formData.hodometro);
    return tipoVistoria === 'SAÍDA' && kmAtual > 0 && kmAtual <= kmReferencia;
  }, [formData.hodometro, kmReferencia, tipoVistoria]);

  const precisaTrocaOleo = useMemo(() => {
    if (!formData.hodometro || !formData.prefixo_vtr) return false;
    const vtr = viaturas.find(v => String(v.Prefixo || v.PREFIXO) === String(formData.prefixo_vtr));
    if (!vtr) return false;

    const kmAtual = Number(formData.hodometro);
    const kmUltima = Number(vtr.KM_UltimaTroca || 0);
    const dataUltimaStr = vtr.Data_UltimaTroca; 

    const limiteKM = kmUltima + 10000;
    const trocaPorKM = (limiteKM - kmAtual) <= 50;

    let trocaPorData = false;
    if (dataUltimaStr) {
      const dataUltima = new Date(dataUltimaStr);
      const hoje = new Date();
      const seisMesesDepois = new Date(dataUltima);
      seisMesesDepois.setMonth(dataUltima.getMonth() + 6);
      trocaPorData = hoje >= seisMesesDepois;
    }
    return trocaPorKM || trocaPorData;
  }, [formData.hodometro, formData.prefixo_vtr, viaturas]);

  const isFormIncompleto = useMemo(() => {
    const servicosEspeciais = ['Operação', 'Outro', 'Patrulha Comunitária'];
    const servicoIncompleto = !formData.tipo_servico || (servicosEspeciais.includes(formData.tipo_servico) && !formData.servico_detalhe);
    return (
      !formData.prefixo_vtr || 
      servicoIncompleto ||
      !formData.hodometro || 
      !formData.motorista_nome || 
      !formData.comandante_nome ||
      kmInvalido
    );
  }, [formData, kmInvalido]);

  useEffect(() => {
    let isMounted = true;
    const sincronizarDados = async () => {
      if (viaturas.length === 0) setLoading(true); 
      try {
        const [resVtr, resMil] = await Promise.all([
          viaturas.length === 0 ? gasApi.getViaturas() : Promise.resolve({ status: 'success', data: viaturas }),
          gasApi.getEfetivoCompleto()
        ]);
        if (isMounted) {
          if (resVtr.status === 'success') setViaturas(resVtr.data);
          if (resMil.status === 'success') setEfetivoLocal(resMil.data);
        }
      } catch (e) { console.error(e); } finally { if (isMounted) setLoading(false); }
    };
    sincronizarDados();
    return () => { isMounted = false; };
  }, [frotaInicial]);

const handleMatriculaChange = (valor, cargo) => {
  // 1. Limpa apenas números
  const apenasNumeros = valor.replace(/\D/g, '');
  
  // 2. Atualiza o RE no formulário imediatamente para o usuário ver o que digita
  setFormData(prev => ({ ...prev, [`${cargo}_re`]: apenasNumeros }));

  // 3. Se o campo for limpo (apagado), resetamos os campos dependentes
  if (apenasNumeros.length === 0) {
    setFormData(prev => ({
      ...prev,
      [`${cargo}_nome`]: '',
      [`${cargo}_unidade`]: ''
    }));
    return;
  }

  // 4. Lógica de busca (mínimo 5 dígitos)
  if (apenasNumeros.length >= 5) {
    // Prepara a variante de busca com prefixo 1000
    const reComPrefixo = apenasNumeros.length === 5 ? "1000" + apenasNumeros : apenasNumeros;

    const militar = efetivoLocal.find(m => 
      String(m.re) === apenasNumeros || 
      String(m.re) === reComPrefixo
    );

    if (militar) {
      // Se achou no cache, preenche automaticamente
      setFormData(prev => ({
        ...prev,
        // Mantemos o RE que o militar usa na base para consistência
        [`${cargo}_re`]: String(militar.re), 
        [`${cargo}_nome`]: `${militar.patente || ''} ${militar.nome || ''}`.trim(),
        [`${cargo}_unidade`]: militar.unidade || '1º BPM'
      }));
    } else {
      // Se NÃO achou (Militar Externo), tratamos a limpeza de campos antigos
      setFormData(prev => {
        const nomeAtual = prev[`${cargo}_nome`] || '';
        
        // Só limpamos o nome se ele pertencer a algum militar que está no cache local.
        // Se o usuário já começou a digitar um nome manualmente (externo), não limpamos.
        const ehNomeDeMilitarInterno = efetivoLocal.some(m => 
          nomeAtual.includes(m.nome) && nomeAtual.length > 3
        );

        if (ehNomeDeMilitarInterno) {
          return {
            ...prev,
            [`${cargo}_nome`]: '',
            [`${cargo}_unidade`]: ''
          };
        }
        return prev;
      });
    }
  }
};
  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) {
      setFormData(prev => ({ 
        ...prev, prefixo_vtr: '', placa_vtr: '', hodometro: '',
        motorista_nome: '', comandante_nome: '', patrulheiro_nome: '' 
      }));
      return;
    }
    const getV = (key) => vtr[key] || vtr[key.toUpperCase()] || vtr[key.toLowerCase()] || '';
    const ultKM = Number(getV('UltimoKM')) || 0;
    setKmReferencia(ultKM);

    if (tipoVistoria === 'SAÍDA') {
      const buscarNome = (re) => {
        if (!re) return '';
        const reLimpo = toStr(re).replace(/\D/g, '');
        const reParaBusca = (reLimpo.length <= 6 && !reLimpo.startsWith("1000")) ? "1000" + reLimpo : reLimpo;
        const m = efetivoLocal.find(mil => toStr(mil.re) === reParaBusca || toStr(mil.re) === reLimpo);
        return m ? `${m.patente} ${m.nome}` : '';
      };
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO),
        placa_vtr: toStr(vtr.Placa || vtr.PLACA),
        tipo_servico: toStr(getV('UltimoTipoServico')),
        servico_detalhe: toStr(getV('UltimoServicoDetalhe')),
        hodometro: toStr(ultKM),
        motorista_re: toStr(getV('UltimoMotoristaRE')),
        motorista_nome: toStr(getV('UltimoMotoristaNome')) || buscarNome(getV('UltimoMotoristaRE')),
        comandante_re: toStr(getV('UltimoComandanteRE')),
        comandante_nome: toStr(getV('UltimoComandanteNome')) || buscarNome(getV('UltimoComandanteRE')),
        patrulheiro_re: toStr(getV('UltimoPatrulheiroRE')),
        patrulheiro_nome: toStr(getV('UltimoPatrulheiroNome')) || buscarNome(getV('UltimoPatrulheiroRE')),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO),
        placa_vtr: toStr(vtr.Placa || vtr.PLACA),
        hodometro: '',
        motorista_re: '', motorista_nome: '',
        comandante_re: '', comandante_nome: '',
        patrulheiro_re: '', patrulheiro_nome: ''
      }));
    }
  };

  const handleFinalizar = async () => {
    if (temAvaria && fotos.length === 0) return alert("Atenção: É obrigatório anexar fotos das avarias.");
    if (!formData.termo_aceite) return alert("Aceite o termo para continuar.");
    if (!window.confirm("Confirmar o envio?")) return;

    setLoading(true);
    try {
      const falhas = Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i);
      const resumo = falhas.length === 0 ? "SEM ALTERAÇÕES" : 
                     tipoVistoria === 'ENTRADA' ? `FALHA EM: ${falhas.join(', ')}` :
                     falhas.map(item => MAPA_FALHAS_SAIDA[item] || item).join(', ');

      const res = await gasApi.saveVistoria({
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: resumo,
        fotos_vistoria: fotos,
        proteger_ocorrencia: protegerFotos,
        militar_logado: `${user.patente} ${user.nome}`,
        status_garageiro: "PENDENTE"
      });
      if (res.status === 'success') { alert("Sucesso!"); onBack(); }
      else { alert("Erro: " + res.message); }
    } catch (e) { alert("Erro de conexão."); } finally { setLoading(false); }
  };

  const CardGuarnicao = ({ compacto = false }) => (
  <div className={`${compacto ? 'bg-slate-800 p-3 rounded-2xl' : 'bg-slate-900 p-5 rounded-3xl'} mb-4 border-b-4 border-blue-600 shadow-inner`}>
    <div className={`flex items-center gap-2 border-b border-white/10 ${compacto ? 'mb-2 pb-1' : 'mb-4 pb-2'}`}>
      <Users className="text-blue-400" size={compacto ? 14 : 18} />
      <span className={`${compacto ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
  {formData[`${m.cargo}_nome`] || `---`}
</span>
    </div>
    <div className="space-y-2">
      {[{ label: 'MOT', cargo: 'motorista' }, { label: 'CMD', cargo: 'comandante' }, { label: 'PTR', cargo: 'patrulheiro' }].map(m => (
        <div key={m.label} className="flex items-center">
          <span className={`${compacto ? 'text-[7px]' : 'text-[9px]'} font-black text-blue-500 w-8 text-center`}>{m.label}</span>
          <div className={`flex-1 ml-2 ${compacto ? 'min-h-[24px] py-1' : 'min-h-[32px] py-2'} flex flex-col justify-center px-3 rounded-lg border ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
            <span className={`${compacto ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
             formData?.[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'
            </span>
            {formData[`${m.cargo}_unidade`] && (
              <span className="text-[7px] text-blue-300 font-medium uppercase leading-tight">
                {formData[`${m.cargo}_unidade`]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">Vistoria de Viatura</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
          <button onClick={() => alterarTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => alterarTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200 space-y-5">
              <CardGuarnicao />
              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">SELECIONE A VTR</option>
                  {viaturasFiltradas.map(v => <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>)}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value, servico_detalhe: ''})}>
                  <option value="">TIPO DE SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {['Operação', 'Outro', 'Patrulha Comunitária'].includes(formData.tipo_servico) && (
                <div className="animate-in zoom-in-95">
                  {formData.tipo_servico === 'Patrulha Comunitária' ? (
                    <select className="vtr-input !bg-blue-50" value={formData.servico_detalhe} onChange={(e) => setFormData({...formData, servico_detalhe: e.target.value})}>
                      <option value="">MODALIDADE</option>
                      {OPCOES_COMUNITARIA.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="vtr-input !bg-blue-50" placeholder="DETALHE DO SERVIÇO" value={formData.servico_detalhe} onChange={(e) => setFormData({...formData, servico_detalhe: e.target.value.toUpperCase()})} />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input type="number" className={`vtr-input w-full ${kmInvalido ? '!border-red-500 !bg-red-50' : ''}`} placeholder="KM" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                  {kmInvalido && <span className="absolute -bottom-4 left-2 text-[8px] text-red-600 font-bold uppercase">KM inválido!</span>}
                </div>
                <select className="vtr-input" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                  <option value="">VIDEOMONITORAMENTO</option>
                  <option value="OPERANTE">OPERANTE</option>
                  <option value="INOPERANTE">INOPERANTE</option>
                  <option value="INDISPONÍVEL">INDISPONÍVEL</option>
                </select>
              </div>

             <div className="space-y-4">
  {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
    <div key={cargo} className="space-y-2 p-3 bg-slate-50 rounded-3xl border border-slate-200">
      <div className="flex justify-between items-center px-2">
        <label className="text-[9px] font-black text-slate-400 uppercase italic">{cargo}</label>
        {formData[`${cargo}_re`]?.length >= 5 && !efetivoLocal.some(m => String(m.re).includes(formData[`${cargo}_re`])) && (
           <span className="text-[7px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">EXTERNO</span>
        )}
      </div>
      
      {/* Input de Matrícula */}
      <input 
        type="tel" 
        placeholder={`MATRÍCULA (RE)`} 
        className="vtr-input !bg-white" 
        value={formData[`${cargo}_re`]} 
        onChange={(e) => handleMatriculaChange(e.target.value, cargo)} 
      />

      {/* Campos Extras: Abrem automaticamente para preenchimento manual */}
      {formData[`${cargo}_re`]?.length >= 5 && (
        <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-300">
          <input 
            type="text" 
            placeholder="GRADUAÇÃO E NOME DE GUERRA" 
            className={`vtr-input !py-3 !text-[10px] ${!formData[`${cargo}_nome`] ? 'border-orange-400 bg-orange-50' : 'bg-blue-50/50 border-blue-100'}`}
            value={formData[`${cargo}_nome`] || ''} 
            onChange={(e) => setFormData({...formData, [`${cargo}_nome`]: e.target.value.toUpperCase()})}
          />
          <input 
            type="text" 
            placeholder="LOTAÇÃO (Ex: 5º BPM, BPFRON...)" 
            className={`vtr-input !py-3 !text-[10px] ${!formData[`${cargo}_unidade`] ? 'border-orange-400 bg-orange-50' : 'bg-blue-50/50 border-blue-100'}`}
            value={formData[`${cargo}_unidade`] || ''} 
            onChange={(e) => setFormData({...formData, [`${cargo}_unidade`]: e.target.value.toUpperCase()})}
          />
        </div>
      )}
    </div>
  ))}
</div>

                {precisaTrocaOleo && (
                  <div className="animate-in zoom-in-95 duration-300">
                    <button type="button" onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-3xl flex items-center justify-between group active:scale-95 transition-all shadow-sm shadow-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500 p-2 rounded-xl text-white shadow-md">
                          <Wrench size={20} className="animate-pulse" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-orange-700 uppercase leading-none">Manutenção de Óleo</p>
                          <p className="text-[8px] font-bold text-orange-500 uppercase italic">Necessário realizar a troca e registrar</p>
                        </div>
                      </div>
                      <div className="bg-orange-500 text-white p-1 rounded-full"><ChevronRight size={16} /></div>
                    </button>
                  </div>
                )}

                <ModalTrocaOleo 
                  isOpen={modalOleoOpen} 
                  onClose={() => setModalOleoOpen(false)}
                  vtr={viaturas.find(v => String(v.Prefixo || v.PREFIXO) === String(formData.prefixo_vtr))}
                  kmEntrada={formData.hodometro}
                  user={user}
                />
              </div>
            </section>
            <button onClick={() => setStep(2)} disabled={isFormIncompleto} className="btn-tatico w-full disabled:opacity-50">PRÓXIMO <ChevronRight size={18}/></button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <CardGuarnicao compacto={true} />
            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-3xl border-2 flex items-center gap-4 cursor-pointer ${protegerFotos ? 'bg-blue-600 text-white' : 'bg-white'}`}>
              {protegerFotos ? <Lock size={20} /> : <Unlock size={20} />}
              <span className="font-black text-[10px]">PROTEGER IMAGENS</span>
            </div>

            <div className="space-y-4">
              {tipoVistoria === 'ENTRADA' ? (
                GRUPOS_ENTRADA.map(grupo => (
                  <div key={grupo.nome} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-3 text-blue-700">
                      {grupo.icon} <span className="font-black text-[10px] uppercase">{grupo.nome}</span>
                    </div>
                    <div className="grid gap-2">
                      {grupo.itens.map(item => (
                        <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border transition-colors cursor-pointer ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'bg-slate-50/50 border-slate-100'}`}>
                          <span className="text-[11px] font-bold uppercase">{item}</span>
                          <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-3xl p-4 border border-slate-200 grid gap-2 shadow-sm">
                  {ITENS_SAIDA.map(item => (
                    <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border transition-colors cursor-pointer ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'bg-slate-50/50 border-slate-100'}`}>
                      <span className="text-[11px] font-bold uppercase">{item}</span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-[2.5rem] border-2 bg-white transition-all shadow-sm ${temAvaria && fotos.length === 0 ? 'border-red-500 animate-pulse' : 'border-slate-200'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 text-center">Fotos da Vistoria (Mín 1 se houver falha)</p>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200">
                    <img src={f} className="object-cover w-full h-full" alt="Vistoria" />
                    <button onClick={() => setFotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    {uploading ? <Loader2 className="animate-spin text-blue-600" /> : <Plus className="text-slate-400" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      try {
                        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
                        const compressed = await imageCompression(file, options);
                        const reader = new FileReader(); 
                        reader.readAsDataURL(compressed);
                        reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                      } catch (err) { setUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-start gap-4 p-5 bg-white border-2 border-slate-200 rounded-3xl cursor-pointer shadow-sm hover:border-blue-300 transition-all">
              <input type="checkbox" className="w-6 h-6 rounded text-blue-600 mt-1" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <p className="text-[10px] font-black uppercase text-slate-600 leading-tight text-justify">
                EU, <span className="text-slate-900 underline">{formData.motorista_nome || 'MOTORISTA'}</span>, 
                {tipoVistoria === 'ENTRADA' ? (
                  <> &nbsp;INFORMO ESTAR ME RESPONSABILIZANDO PELA VIATURA <span className="text-blue-600 font-black">{formData.prefixo_vtr || '_______'}</span>, CIENTE DO ESTADO DE CONSERVAÇÃO DOS ITENS ACIMA VISTORIADOS. </>
                ) : (
                  <> &nbsp;ESTOU REALIZANDO A ENTREGA DA VIATURA <span className="text-orange-600 font-black">{formData.prefixo_vtr || '_______'}</span>, ATESTANDO QUE O ESTADO DE LIMPEZA E CONSERVAÇÃO CONDIZ COM O CHECKLIST REALIZADO. </>
                )}
              </p>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200 text-slate-900">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} className="btn-tatico flex-[2] disabled:bg-slate-300 disabled:text-slate-500 shadow-lg active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR ENVIO"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const ModalTrocaOleo = ({ isOpen, onClose, vtr, kmEntrada, user }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fotoOleo, setFotoOleo] = useState(null);
  const [dadosOleo, setDadosOleo] = useState({
    data_troca: new Date().toISOString().split('T')[0],
    km_troca: kmEntrada || ''
  });

  // Sincroniza o KM do modal com o KM digitado na vistoria ao abrir
  useEffect(() => {
    if (isOpen) {
      setDadosOleo(prev => ({ ...prev, km_troca: kmEntrada }));
    }
  }, [isOpen, kmEntrada]);

  if (!isOpen || !vtr) return null;

  const handleSalvar = async () => {
    const kmTrocaNum = Number(dadosOleo.km_troca);
    const kmEntradaNum = Number(kmEntrada);

    // Validações de segurança
    if (!kmTrocaNum || kmTrocaNum <= 0) return alert("Informe um KM válido.");
    if (kmTrocaNum < kmEntradaNum) {
      return alert(`O KM da troca (${kmTrocaNum}) não pode ser menor que o KM de entrada (${kmEntradaNum}).`);
    }
    if (!fotoOleo) return alert("É obrigatório anexar a foto do comprovante/etiqueta.");

    setLoading(true);
    try {
      const res = await gasApi.registrarTrocaOleo({
        prefixo: vtr.Prefixo || vtr.PREFIXO,
        data_troca: dadosOleo.data_troca,
        km_troca: kmTrocaNum,
        foto: fotoOleo,
        militar_re: user?.re || '',
        militar_nome: `${user?.patente || ''} ${user?.nome || ''}`.trim()
      });

      if (res.status === 'success') {
        alert("Manutenção de óleo registrada com sucesso!");
        setFotoOleo(null); // Limpa a foto para o próximo uso
        onClose();
      } else {
        alert("Erro ao registrar: " + res.message);
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao salvar manutenção.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressed);
      reader.onloadend = () => {
        setFotoOleo(reader.result);
        setUploading(false);
      };
    } catch (err) {
      console.error(err);
      setUploading(false);
      alert("Erro ao processar imagem.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 shadow-2xl border-t-8 border-orange-500 animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600">
            <Wrench size={32} />
          </div>
          <h2 className="font-black text-slate-900 uppercase text-sm">Registrar Troca de Óleo</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase">{vtr.Prefixo || vtr.PREFIXO}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Data da Troca</label>
            <input 
              type="date" 
              className="vtr-input !bg-slate-50 w-full" 
              value={dadosOleo.data_troca} 
              onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} 
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">KM no momento da troca</label>
            <input 
              type="number" 
              className="vtr-input !bg-slate-50 w-full" 
              placeholder="KM DA TROCA"
              value={dadosOleo.km_troca} 
              onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} 
            />
          </div>
        </div>

        <div className="p-4 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50 min-h-[120px] flex items-center justify-center">
          {fotoOleo ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200">
              <img src={fotoOleo} className="w-full h-full object-cover" alt="Comprovante" />
              <button 
                onClick={() => setFotoOleo(null)} 
                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg"
              >
                <X size={16}/>
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center py-4 w-full">
              {uploading ? (
                <Loader2 className="animate-spin text-orange-500" size={24} />
              ) : (
                <>
                  <Plus className="text-orange-500 mb-1" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Foto do Comprovante / Etiqueta</span>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 font-black text-[10px] uppercase text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvar} 
            disabled={loading || uploading} 
            className="flex-[2] bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Confirmar Manutenção"}
          </button>
        </div>
      </div>
    </div>
  );
};
  if (!isOpen || !vtr) return null;

  const handleSalvar = async () => {
    if (Number(dadosOleo.km_troca) <= Number(kmEntrada)) return alert("O KM da troca deve ser maior que o KM de entrada!");
    if (!fotoOleo) return alert("Anexe a foto do comprovante.");
    setLoading(true);
    try {
      const res = await gasApi.registrarTrocaOleo({
        prefixo: vtr.Prefixo || vtr.PREFIXO,
        ...dadosOleo,
        foto: fotoOleo,
        militar_re: user.re,
        militar_nome: `${user.patente} ${user.nome}`
      });
      if (res.status === 'success') { alert("Registrado!"); onClose(); }
    } catch (e) { alert("Erro ao enviar."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 shadow-2xl border-t-8 border-orange-500">
        <div className="text-center">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600"><Wrench size={32} /></div>
          <h2 className="font-black text-slate-900 uppercase text-sm">Registrar Troca de Óleo</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="vtr-input !bg-slate-50" value={dadosOleo.data_troca} onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} />
          <input type="number" className="vtr-input !bg-slate-50" value={dadosOleo.km_troca} onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} />
        </div>
        <div className="p-4 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50">
          {fotoOleo ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden"><img src={fotoOleo} className="w-full h-full object-cover" /><button onClick={() => setFotoOleo(null)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"><X size={14}/></button></div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center py-4">
              <Plus className="text-orange-500 mb-1" /><span className="text-[10px] font-black text-slate-500 uppercase">Foto do Comprovante</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                 const file = e.target.files[0]; if (!file) return;
                 const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024 };
                 const compressed = await imageCompression(file, options);
                 const reader = new FileReader(); reader.readAsDataURL(compressed);
                 reader.onloadend = () => setFotoOleo(reader.result);
              }} />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-4 font-black text-[10px] uppercase text-slate-400">Cancelar</button>
          <button onClick={handleSalvar} disabled={loading} className="flex-[2] bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase">{loading ? "..." : "Confirmar Troca"}</button>
        </div>
      </div>
    </div>
  );
};

export default Vistoria;
