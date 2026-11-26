import { useState } from 'react';
import { COMMISSIONS } from '@/src/lib/commissionService';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Icons } from './Icons';

interface AgentFeeTermsBoxProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  estimatedPrice?: number;
  contextLabel?: string;
  compact?: boolean;
}

export default function AgentFeeTermsBox({
  accepted,
  onChange,
  estimatedPrice,
  contextLabel = 'esta solicitação',
  compact = false,
}: AgentFeeTermsBoxProps) {
  const [expanded, setExpanded] = useState(false);

  const estimatedAgentFee =
    estimatedPrice && estimatedPrice > 0
      ? Math.round((estimatedPrice * COMMISSIONS.agentCommissionPercent) / 100)
      : null;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors',
        accepted ? 'border-emerald-300 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/50',
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Icons.Scale size={16} className={accepted ? 'text-emerald-700' : 'text-amber-700'} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
            Termos & Condições da Taxa do Agente
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer shrink-0"
        >
          {expanded ? 'Ocultar detalhes' : 'Ler termos completos'}
        </button>
      </div>

      <p className="text-xs text-gray-700 leading-relaxed mb-3">
        A mediação imobiliária através dos agentes licenciados Ki-Imóveis aplica uma comissão padrão de{' '}
        <strong>{COMMISSIONS.agentCommissionPercent}%</strong> sobre o valor acordado no fecho do contrato
        {estimatedAgentFee ? (
          <span className="text-gray-600">
            {' '}
            (estimativa: <strong className="tabular-nums">{formatCurrency(estimatedAgentFee)}</strong>)
          </span>
        ) : null}
        , paga apenas após conclusão e validação documental — nunca antecipadamente em visitas.
      </p>

      {expanded && (
        <div className="mb-3 p-3 rounded-xl bg-white border border-gray-200 text-[11px] text-gray-600 space-y-1.5 leading-relaxed">
          <p>
            <strong>1. Comissão de Mediação ({COMMISSIONS.agentCommissionPercent}%):</strong> Aplicável apenas quando o negócio de compra, venda ou arrendamento mediado pelo agente parceiro for formalizado.
          </p>
          <p>
            <strong>2. Taxa de Serviço da Plataforma ({COMMISSIONS.platformFeePercent}%):</strong> Cobre verificação documental, rastreabilidade de visitas e proteção de transação na Ki-Imóveis.
          </p>
          <p>
            <strong>3. Proteção ao Cliente:</strong> O agendamento de visitas presenciais é gratuito. Não efetue pagamentos fora dos contratos validados e sem Certidão de Registo Predial.
          </p>
        </div>
      )}

      <label className="flex items-start gap-2.5 text-xs font-semibold text-gray-900 cursor-pointer select-none">
        <input
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-primary cursor-pointer shrink-0"
        />
        <span>
          Li e aceito os Termos e Condições, incluindo a taxa de mediação do agente (
          {COMMISSIONS.agentCommissionPercent}%) aplicável a {contextLabel}.
        </span>
      </label>
    </div>
  );
}
