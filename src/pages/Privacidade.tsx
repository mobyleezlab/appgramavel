import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoSrc from "@/assets/logo_gramavel_header.svg";

const LAST_UPDATE = new Date().toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const CONTACT_EMAIL = "privacidade@gramavel.com.br";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-foreground mt-8 mb-3 scroll-mt-20">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-foreground mt-5 mb-2">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground mb-3">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground mb-3">
      {children}
    </ul>
  );
}

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/auth/login"
            className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
          <img src={logoSrc} alt="Gramável" className="h-6" />
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Política de Privacidade — Gramável
        </h1>
        <p className="text-xs text-muted-foreground mb-6">
          <strong className="text-foreground">Última atualização:</strong> {LAST_UPDATE}
        </p>

        <P>
          Esta Política de Privacidade descreve como o Gramável ("nós", "aplicativo",
          "plataforma"), operado por Mobyleez, coleta, usa, armazena e protege os dados
          pessoais dos usuários ("você", "titular"), em conformidade com a Lei Geral de
          Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
        </P>
        <P>
          Ao criar uma conta ou usar o Gramável, você concorda com os termos descritos aqui.
          Se não concordar, pedimos que não utilize a plataforma.
        </P>

        <H2>1. Quem é o controlador dos dados</H2>
        <UL>
          <li><strong className="text-foreground">Controlador:</strong> Mobyleez (Gramável)</li>
          <li><strong className="text-foreground">Região de operação:</strong> Gramado/Canela, Rio Grande do Sul, Brasil</li>
          <li>
            <strong className="text-foreground">Contato para assuntos de privacidade:</strong>{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
          </li>
        </UL>

        <H2>2. Quais dados coletamos</H2>
        <H3>2.1 Dados fornecidos por você no cadastro</H3>
        <UL>
          <li>Nome completo</li>
          <li>E-mail</li>
          <li>Senha (armazenada de forma criptografada, nunca em texto puro)</li>
          <li>Data de nascimento</li>
          <li>Gênero</li>
          <li>Cidade e estado</li>
        </UL>

        <H3>2.2 Dados gerados pelo uso do aplicativo</H3>
        <UL>
          <li>Check-ins: estabelecimento visitado, data/hora, e localização geográfica no momento do check-in</li>
          <li>Avaliações (reviews): nota e comentário sobre estabelecimentos</li>
          <li>Favoritos e pastas de favoritos</li>
          <li>Reações: curtidas/emojis em publicações e fotos</li>
          
          <li>Cupons resgatados</li>
          <li>Selos/badges de gamificação</li>
          <li>Foto de perfil (avatar)</li>
          <li>Linha do tempo de atividades dentro do app</li>
        </UL>

        <H3>2.3 Dados que não coletamos</H3>
        <P>
          Não coletamos CPF, dados financeiros/cartão de crédito, nem geolocalização contínua
          em segundo plano — a localização só é registrada no momento do check-in.
        </P>

        <H2>3. Para que usamos seus dados</H2>
        <div className="overflow-x-auto -mx-4 px-4 mb-3">
          <table className="w-full text-sm border-collapse min-w-[420px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left font-semibold text-foreground p-3 border border-border">Finalidade</th>
                <th className="text-left font-semibold text-foreground p-3 border border-border">Base legal (LGPD)</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ["Criar e gerenciar sua conta", "Execução de contrato (Art. 7º, V)"],
                ["Exibir check-ins e avaliações", "Execução de contrato"],
                ["Personalizar recomendações", "Consentimento / legítimo interesse (Art. 7º, IX)"],
                ["Gamificação", "Execução de contrato"],
                ["Comunicações sobre a conta", "Execução de contrato"],
                ["Moderação e prevenção a abusos", "Legítimo interesse (Art. 7º, IX)"],
                ["Cumprimento de obrigação legal", "Obrigação legal (Art. 7º, II)"],
              ].map(([f, b]) => (
                <tr key={f}>
                  <td className="p-3 border border-border align-top">{f}</td>
                  <td className="p-3 border border-border align-top">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P><strong className="text-foreground">Não vendemos seus dados pessoais a terceiros.</strong></P>

        <H2>4. Com quem compartilhamos dados</H2>
        <UL>
          <li>Estabelecimentos parceiros, apenas confirmação de resgate de cupom.</li>
          <li>Supabase, como operador de infraestrutura (banco de dados e autenticação).</li>
          <li>Autoridades, quando exigido por lei ou ordem judicial.</li>
        </UL>
        <P>Não compartilhamos dados com anunciantes ou corretores de dados.</P>

        <H2>5. Seus direitos como titular (Art. 18 da LGPD)</H2>
        <P>
          Você pode solicitar, a qualquer momento: confirmação do tratamento, acesso aos dados,
          correção, anonimização/bloqueio/eliminação, portabilidade, eliminação (exclusão de
          conta), informação sobre compartilhamento, revogação de consentimento, e revisão de
          decisões automatizadas.
        </P>
        <P>Para exercer esses direitos, entre em contato pelo e-mail informado na Seção 1.</P>
        <P>
          Ao excluir sua conta, apagamos seus dados de perfil, check-ins, avaliações,
          favoritos, reações, cupons, selos e histórico de atividades.
        </P>

        <H2>6. Por quanto tempo guardamos seus dados</H2>
        <P>
          Enquanto sua conta estiver ativa. Após exclusão, os dados são removidos
          permanentemente, exceto quando a lei exigir retenção específica.
        </P>

        <H2>7. Segurança dos dados</H2>
        <P>
          Usamos controle de acesso por linha no banco de dados, senhas criptografadas,
          conexão HTTPS/TLS, e verificações periódicas de segurança. Em caso de incidente
          relevante, comunicaremos os usuários e a ANPD conforme a LGPD.
        </P>

        <H2>8. Menores de idade</H2>
        <P>
          O Gramável não é direcionado a menores de 18 anos e não coleta intencionalmente
          dados de crianças ou adolescentes sem consentimento específico de um responsável
          legal.
        </P>

        <H2>9. Cookies e armazenamento local</H2>
        <P>
          Usamos armazenamento local para manter sua sessão logada. Não usamos cookies de
          rastreamento de terceiros para publicidade.
        </P>

        <H2>10. Alterações nesta política</H2>
        <P>
          Podemos atualizar esta política periodicamente. Mudanças relevantes serão
          comunicadas no app antes de entrarem em vigor.
        </P>

        <H2>11. Contato</H2>
        <P>
          Dúvidas ou solicitações sobre seus dados pessoais:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
        </P>
      </main>
    </div>
  );
}
