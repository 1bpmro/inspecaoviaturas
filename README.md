# 🚓 Inspeção de Viaturas - 1º BPM Rondônia

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.1+-646CFF.svg)](https://vitejs.dev)

Sistema web mobile-first para gestão de vistorias de veículos, checklist de saída/entrada e controle de frota da Polícia Militar de Rondônia. Desenvolvido com React, Vite e Firebase.

## 📋 Características Principais

### ✨ Funcionalidades
- **Vistoria de Veículos**: Checklist completo de saída/entrada com fotografia
- **Controle de Pátio**: Validação de vistorias e controle de chaves (Garageiro)
- **Gestão de Frota**: Dashboard administrativo com CRUD de veículos
- **Histórico Pessoal**: Acompanhamento de vistorias realizadas por usuário
- **Autenticação**: Sistema de login com controle de permissões por função
- **Logout por Inatividade**: Proteção automática com aviso visual (5min Vistoria / 20min outros)

### 🎯 Funções de Usuário
- **Operacional**: Realiza vistorias de saída/entrada
- **Garageiro**: Valida vistorias e controla chaves de veículos
- **Admin**: Acesso total à gestão de frota e relatórios

### 📱 Características Técnicas
- ✅ **Progressive Web App (PWA)**: Funciona offline com Service Worker
- ✅ **Mobile-First**: Totalmente otimizado para smartphone
- ✅ **Compressão de Imagens**: Reduz tamanho de fotos automaticamente
- ✅ **Cache Local**: Sincronização de dados com LocalStorage
- ✅ **Modo Claro Forçado**: Proteção contra Dark Mode do SO
- ✅ **Suporte Notch**: Compatível com dispositivos com entalhe
- ✅ **Deploy Automático**: Integrado com GitHub Pages

---

## 🚀 Quick Start

### Pré-requisitos
- **Node.js** 18+ ([download](https://nodejs.org))
- **npm** 9+ ou **yarn**
- Conta Firebase configurada

### 1️⃣ Clonar e Instalar

```bash
git clone https://github.com/1bpmro/inspecaoviaturas.git
cd inspecaoviaturas
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (baseado em `.env.example`):

```bash
cp .env.example .env.local
```

Edite `.env.local` e preencha as credenciais do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_chave_api
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

# Google Sheets API (para integração de dados)
VITE_GAS_DEPLOYMENT_ID=seu_google_apps_script_id
```

### 3️⃣ Rodar em Desenvolvimento

```bash
npm run dev
```

A aplicação abrirá em `http://localhost:5173`

### 4️⃣ Build para Produção

```bash
npm run build
```

Os arquivos compilados estarão em `dist/`

### 5️⃣ Visualizar Build

```bash
npm run preview
```

---

## 📁 Estrutura do Projeto

```
inspecaoviaturas/
├── public/                      # Arquivos estáticos
│   ├── icon-512.png           # Ícone PWA
│   ├── manifest.json          # Manifesto PWA
│   └── sw.js                  # Service Worker
│
├── src/
│   ├── api/                   # Integrações com APIs
│   │   └── gasClient.js       # Cliente Google Apps Script
│   │
│   ├── components/            # Componentes reutilizáveis
│   │   └── ModalTrocaSenha.jsx
│   │
│   ├── lib/                   # Utilitários e contextos
│   │   └── AuthContext.jsx    # Context de autenticação
│   │
│   ├── pages/                 # Páginas/Views principais
│   │   ├── Login.jsx
│   │   ├── Vistoria.jsx
│   │   ├── GarageiroDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── HistoricoPessoal.jsx
│   │
│   ├── App.jsx                # Componente raiz com routing
│   ├── main.jsx               # Entrada da aplicação
│   └── index.css              # Estilos globais
│
├── index.html                 # Template HTML
├── package.json               # Dependências do projeto
├── vite.config.js             # Configuração do Vite
├── tailwind.config.js         # Configuração Tailwind CSS
├── postcss.config.js          # Configuração PostCSS
├── .env.example               # Exemplo de variáveis
├── .env.local                 # ⚠️ Não commitar (gitignored)
├── README.md                  # Este arquivo
└── LICENSE                    # MIT License
```

### Diretórios por Funcionalidade
- **api/** - Clients HTTP (Firebase, Google Sheets, etc)
- **components/** - Componentes React reutilizáveis
- **lib/** - Contextos, hooks customizados e utilitários
- **pages/** - Componentes de página/view completas

---

## 🔐 Configuração Firebase

### Passos para configurar Firebase:

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto ou use um existente
3. Habilite **Authentication** (Email/Password)
4. Configure **Firestore Database** (ou Realtime Database)
5. Vá em **Project Settings** → **Your apps** → **Web**
6. Copie as credenciais e preencha `.env.local`

### Estrutura Firestore Recomendada:
```
users/
├── {userId}/
│   ├── nome: string
│   ├── email: string
│   ├── patente: string
│   ├── role: "operacional" | "garageiro" | "admin"
│   └── criadoEm: timestamp

viaturas/
├── {viaturaId}/
│   ├── placa: string
│   ├── modelo: string
│   ├── status: "disponivel" | "manutencao"
│   └── patrimonial: string

vistorias/
├── {vistoriaId}/
│   ├── dataHora: timestamp
│   ├── usuario: reference
│   ├── viatura: reference
│   ├── tipo: "saida" | "entrada"
│   ├── checklist: {...}
│   └── fotos: array
```

---

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
# Inicia servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Visualiza build local
npm run preview
```

### Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| `react` | ^18.2.0 | Framework UI |
| `react-router-dom` | ^6.22.0 | Roteamento |
| `firebase` | ^10.8.0 | Backend |
| `tailwindcss` | ^3.4.1 | Estilos |
| `lucide-react` | ^0.344.0 | Ícones |
| `axios` | ^1.6.7 | HTTP Client |
| `recharts` | ^2.12.0 | Gráficos |
| `browser-image-compression` | ^2.0.2 | Compressão de imagens |

### DevDependencies Principais

```bash
npm install -D vite @vitejs/plugin-react vitest testing-library
npm install -D eslint prettier @rocketseat/eslint-config
npm install -D husky lint-staged
```

---

## 🔄 Fluxo de Autenticação

```
┌─────────────────┐
│   Login Page    │
│  (Email/Senha)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Firebase Auth Module   │
│  (Email/Password)       │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│   AuthContext Provider   │
│  - User Data             │
│  - isAuthenticated       │
│  - isAdmin/isGarageiro   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│   Dashboard/Views        │
│  (Renderiza via Roles)   │
└──────────────────────────┘
```

---

## 🔒 Segurança & Boas Práticas

### ✅ Implementado
- ✓ Logout automático por inatividade
- ✓ Proteção contra refresh (F5)
- ✓ Autenticação Firebase
- ✓ Controle de acesso por role
- ✓ Modo claro forçado (evita exposição em dark mode)

### 🔄 Próximas Melhorias
- [ ] Rate limiting nas APIs
- [ ] Validação de entrada robusta
- [ ] HTTPS obrigatório
- [ ] Proteção CSRF
- [ ] Teste de segurança automatizado
- [ ] Logs de auditoria

---

## 📊 PWA & Deploy

### GitHub Pages
A aplicação está configurada para deploy automático no GitHub Pages:

```javascript
// vite.config.js
base: '/inspecaoviaturas/',
```

**Deploy Manual:**
```bash
npm run build
# Os arquivos em dist/ serão servidos em:
# https://1bpmro.github.io/inspecaoviaturas/
```

### Service Worker
O Service Worker em `public/sw.js` permite:
- Funcionamento offline
- Cache de recursos estáticos
- Sincronização de dados em background

**Registrado em:** `src/main.jsx`

---

## 🐛 Troubleshooting

### Erro: "VITE_FIREBASE_API_KEY is undefined"
**Solução**: Certifique-se de ter criado `.env.local` com variáveis válidas.

### Aplicação carregando infinitamente
**Checklist**:
- [ ] Firebase está acessível (checar firewall)
- [ ] Credenciais estão corretas
- [ ] Console não mostra erros (F12)
- [ ] Limpar localStorage: `localStorage.clear()`

### Fotos não comprimem
**Solução**: Verificar se `browser-image-compression` está instalado:
```bash
npm install browser-image-compression
```

### Não sincroniza com Google Sheets
**Checklist**:
- [ ] Google Apps Script está publicado
- [ ] Deployment ID está correto em `.env.local`
- [ ] Script tem permissão para ler/escrever

---

## 📚 Documentação Complementar

- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Lucide Icons](https://lucide.dev)

---

## 🤝 Contribuindo

### Passos para Contribuir

1. **Fork** o repositório
2. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/sua-feature
   ```
3. **Commit** com mensagens claras:
   ```bash
   git commit -m "feat: adiciona nova funcionalidade"
   ```
4. **Push** para sua branch:
   ```bash
   git push origin feature/sua-feature
   ```
5. **Abra um Pull Request** com descrição detalhada

### Padrões de Commit
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação/estilos
- `refactor:` - Refatoração de código
- `test:` - Testes
- `chore:` - Manutenção

---

## 📝 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique [Issues](https://github.com/1bpmro/inspecaoviaturas/issues) existentes
2. Crie uma nova [Issue](https://github.com/1bpmro/inspecaoviaturas/issues/new) detalhando:
   - Descrição do problema
   - Passos para reproduzir
   - Screenshots/Logs
   - Ambiente (SO, navegador, versão Node)

---

## 📈 Roadmap

### v0.2.0 (Próximo)
- [ ] Testes unitários com Vitest
- [ ] ESLint + Prettier
- [ ] Migração para TypeScript
- [ ] Melhorias na validação de formulários

### v0.3.0
- [ ] Relatórios em PDF
- [ ] Exportação Excel
- [ ] Gráficos avançados com Recharts
- [ ] Notificações push

### v1.0.0
- [ ] App nativa iOS/Android (React Native ou Capacitor)
- [ ] Sincronização real-time com Firestore
- [ ] Dashboard Web completo
- [ ] Autenticação multi-factor

---

## 👤 Autor

**1º BPM Rondônia**
- GitHub: [@1bpmro](https://github.com/1bpmro)

---

**Última atualização**: Maio de 2026  
**Status**: Em desenvolvimento ativo 🚀
