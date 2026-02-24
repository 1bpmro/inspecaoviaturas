/**
 * CONFIGURAÇÕES INTEGRADAS - 1º BPM/RO
 */
const CONFIG = {
  PASTA_RAIZ_FOTOS_ID: "1weuFnao7DjVMQWpUdEMStSVXATmNmeLq",
  ID_PLANILHA_EFETIVO: "1w9cEv32jmc828DutDsrde_YoMJoMR6LRVBGuedf8u88",
  ID_PLANILHA_PATRIMONIO: "10e3xyThqZqjITgAfiFqnMqYdigsRzehzEVvLBZVjMIA",
  DIAS_PARA_LIMPEZA: 180,
  TAG_PROTECAO: "OCORRENCIA_GRAVE"
};

/**
 * RECEBE AS REQUISIÇÕES DO FRONTEND
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;

    switch (action) {
      case 'checkProfile': return respostaJson(checkProfile(payload.re));
      case 'login': return respostaJson(loginUsuario(payload.re, payload.senha));
      case 'saveVistoria': return registrarVistoria(payload);
      case 'getViaturas': return respostaJson(buscarViaturas());
      case 'buscarMilitar': return respostaJson(buscarMilitarPorRE(payload.re));
      case 'getVistoriasPendentes': return respostaJson(getVistoriasPendentes());
      case 'confirmarVistoriaGarageiro': return respostaJson(confirmarVistoriaGarageiro(payload));
      case 'alterarStatusViatura': return respostaJson(alterarStatusVtr(payload.prefixo, payload.novoStatus));
      default: return respostaJson({ status: "error", message: "Ação não reconhecida" });
    }
  } catch (error) {
    return respostaJson({ status: "error", message: error.toString() });
  }
}

/**
 * LÓGICA DE VISTORIA COM AUTO-CADASTRO E ATUALIZAÇÃO DE FROTA
 */
function registrarVistoria(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoje = new Date();
  const abaNome = Utilities.formatDate(hoje, "GMT-3", "MM-yyyy");
  
  let sheet = ss.getSheetByName(abaNome);
  if (!sheet) {
    sheet = ss.insertSheet(abaNome);
    // Cabeçalho Mensal Organizado
    const cabecalho = ["Data_Hora", "tipo_vistoria", "prefixo_vtr", "placa_vtr", "hodometro", "tipo_servico", "unidade_externa", "motorista_re", "motorista_nome", "comandante_re", "comandante_nome", "patrulheiro_re", "patrulheiro_nome", "checklist_resumo", "militar_logado", "Links_Fotos", "status_garageiro"];
    sheet.appendRow(cabecalho).getRange(1, 1, 1, cabecalho.length).setFontWeight("bold").setBackground("#1E3A8A").setFontColor("white");
    sheet.setFrozenRows(1);
  }

  // --- 1. PROCESSAMENTO DE FOTOS ---
  let linksFotos = [];
  if (payload.fotos_vistoria && Array.isArray(payload.fotos_vistoria)) {
    payload.fotos_vistoria.forEach((base64, index) => {
      const nomeArquivo = `VTR_${payload.prefixo_vtr}_${payload.tipo_vistoria}_${index + 1}_${Date.now()}.jpg`;
      linksFotos.push(salvarImagemNoDrive(payload.prefixo_vtr, base64, nomeArquivo));
    });
  }

  // --- 2. REGISTRO NA PLANILHA MENSAL ---
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const novaLinha = headers.map(h => {
    if (h === "Data_Hora") return hoje;
    if (h === "Links_Fotos") return linksFotos.join(" | ");
    if (h === "status_garageiro") return "";
    
    const valor = payload[h];
    return Array.isArray(valor) ? valor.join(", ") : (valor === undefined ? "" : valor);
  });
  sheet.appendRow(novaLinha);

  // --- 3. ATUALIZAÇÕES DE SISTEMA ---
  atualizarPatrimonioPosVistoria(payload);
  verificarEAutoCadastrarMilitar(payload);

  return respostaJson({ status: "success", message: "Vistoria registrada e frota atualizada!" });
}

/**
 * ATUALIZA A PLANILHA DE PATRIMÔNIO (FROTA EM TEMPO REAL)
 */
function atualizarPatrimonioPosVistoria(p) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_PATRIMONIO);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const col = {
    prefixo: headers.indexOf("Prefixo"),
    status: headers.indexOf("Status"),
    km: headers.indexOf("UltimoKM"),
    motRe: headers.indexOf("UltimoMotoristaRE"),
    motNome: headers.indexOf("UltimoMotoristaNome"),
    cmdRe: headers.indexOf("UltimoComandanteRE"),
    cmdNome: headers.indexOf("UltimoComandanteNome"),
    patRe: headers.indexOf("UltimoPatrulheiroRE"),
    patNome: headers.indexOf("UltimoPatrulheiroNome"),
    tipoServ: headers.indexOf("UltimoTipoServico"),
    visto: headers.indexOf("UltimaVistoria")
  };

  for (let i = 1; i < data.length; i++) {
    if (data[i][col.prefixo].toString() === p.prefixo_vtr.toString()) {
      const row = i + 1;
      const novoStatus = (p.tipo_vistoria === "ENTRADA") ? "EM SERVIÇO" : "DISPONÍVEL";
      
      sheet.getRange(row, col.status + 1).setValue(novoStatus);
      sheet.getRange(row, col.km + 1).setValue(p.hodometro);
      sheet.getRange(row, col.visto + 1).setValue(new Date());

      if (p.tipo_vistoria === "ENTRADA") {
        sheet.getRange(row, col.motRe + 1).setValue(p.motorista_re);
        sheet.getRange(row, col.motNome + 1).setValue(p.motorista_nome);
        sheet.getRange(row, col.cmdRe + 1).setValue(p.comandante_re);
        sheet.getRange(row, col.cmdNome + 1).setValue(p.comandante_nome);
        sheet.getRange(row, col.patRe + 1).setValue(p.patrulheiro_re);
        sheet.getRange(row, col.patNome + 1).setValue(p.patrulheiro_nome);
        sheet.getRange(row, col.tipoServ + 1).setValue(p.tipo_servico);
      }
      break;
    }
  }
}

/**
 * AUTO-CADASTRO DE MILITARES NOVOS OU EXTERNOS
 */
function verificarEAutoCadastrarMilitar(p) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_EFETIVO);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  const militares = [
    { re: p.motorista_re, nome: p.motorista_nome_cru, grad: p.motorista_grad },
    { re: p.comandante_re, nome: p.comandante_nome_cru, grad: p.comandante_grad },
    { re: p.patrulheiro_re, nome: p.patrulheiro_nome_cru, grad: p.patrulheiro_grad }
  ];

  militares.forEach(m => {
    if (!m.re || m.re.length < 4 || !m.nome) return;
    const existe = data.some(row => row[0].toString() === m.re.toString());
    if (!existe) {
      sheet.appendRow([m.re, m.nome.toUpperCase(), m.grad, "POLICIAL", "123456"]);
    }
  });
}

/**
 * SALVA IMAGEM NO DRIVE
 */
function salvarImagemNoDrive(prefixo, base64Data, nomeArquivo) {
  try {
    const pastaRaiz = DriveApp.getFolderById(CONFIG.PASTA_RAIZ_FOTOS_ID);
    let pastaVtr;
    const pastas = pastaRaiz.getFoldersByName(prefixo);
    pastaVtr = pastas.hasNext() ? pastas.next() : pastaRaiz.createFolder(prefixo);

    const contentType = base64Data.substring(5, base64Data.indexOf(';'));
    const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, nomeArquivo);
    const arquivo = pastaVtr.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return arquivo.getUrl();
  } catch (e) { return "Erro no Upload"; }
}

// --- FUNÇÕES DE APOIO ---

function buscarMilitarPorRE(re) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_EFETIVO);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === re.toString().trim()) {
      return { status: "success", nome: data[i][1], patente: data[i][2] };
    }
  }
  return { status: "new", message: "Militar não encontrado" };
}

function loginUsuario(re, senha) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_EFETIVO);
  const sheet = ss.getSheets()[0]; 
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === re.toString().trim()) {
      const dbRole = data[i][3] || "POLICIAL";
      if ((dbRole === 'ADMIN' || dbRole === 'GARAGEIRO') && data[i][4].toString() !== senha.toString()) {
        return { status: "error", message: "Senha incorreta" };
      }
      return { status: "success", user: { re: data[i][0], nome: data[i][1], patente: data[i][2], role: dbRole } };
    }
  }
  return { status: "error", message: "RE não encontrado" };
}

function buscarViaturas() {
  const ssPatrimonio = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_PATRIMONIO);
  const sheetPatr = ssPatrimonio.getSheets()[0];
  const dataPatr = sheetPatr.getDataRange().getValues();
  const headers = dataPatr.shift();
  let viaturas = dataPatr.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return { status: "success", data: viaturas };
}

function getVistoriasPendentes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoje = new Date();
  const abaNome = Utilities.formatDate(hoje, "GMT-3", "MM-yyyy");
  const sheet = ss.getSheetByName(abaNome);
  if (!sheet) return { status: "success", data: [] };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colStatus = headers.indexOf("status_garageiro");
  const colTipo = headers.indexOf("tipo_vistoria");
  
  const pendentes = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][colTipo] === "ENTRADA" && (!data[i][colStatus] || data[i][colStatus] === "")) {
      let obj = { row: i + 1 };
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      pendentes.push(obj);
    }
  }
  return { status: "success", data: pendentes };
}

function confirmarVistoriaGarageiro(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoje = new Date();
  const abaNome = Utilities.formatDate(hoje, "GMT-3", "MM-yyyy");
  const sheet = ss.getSheetByName(abaNome);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colStatus = headers.indexOf("status_garageiro") + 1;
  sheet.getRange(payload.row, colStatus).setValue("CONFERIDO: " + payload.data_confirmacao);
  return { status: "success" };
}

function alterarStatusVtr(prefixo, novoStatus) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_PATRIMONIO);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colPrefixo = headers.indexOf("Prefixo");
  const colStatus = headers.indexOf("Status");
  for (let i = 1; i < data.length; i++) {
    if (data[i][colPrefixo].toString() === prefixo.toString()) {
      sheet.getRange(i + 1, colStatus + 1).setValue(novoStatus);
      return { status: "success" };
    }
  }
  return { status: "error", message: "VTR não encontrada" };
}

function checkProfile(re) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_EFETIVO);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === re.toString().trim()) {
      return { status: "success", role: data[i][3] ? data[i][3].toString().toUpperCase() : "POLICIAL" };
    }
  }
  return { status: "error", role: "POLICIAL" };
}

function respostaJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
