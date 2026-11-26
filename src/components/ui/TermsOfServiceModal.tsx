import { useEffect, useState } from 'react';
import { COMMISSIONS } from '@/src/lib/commissionService';
import { formatCurrency } from '@/src/lib/utils';
import { Icons } from './Icons';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
  propertyTitle?: string;
  estimatedPrice?: number;
  propertyStatus?: 'sale' | 'rent';
}

export default function TermsOfServiceModal({
  isOpen,
  onAccept,
  onCancel,
  propertyTitle,
  estimatedPrice,
  propertyStatus,
}: TermsOfServiceModalProps) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const estimatedAgentFee =
    estimatedPrice && estimatedPrice > 0
      ? Math.round((estimatedPrice * COMMISSIONS.agentCommissionPercent) / 100)
      : null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tos-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Icons.Scale size={20} className="text-amber-700" />
            </div>
            <div>
              <h3 id="tos-modal-title" className="text-lg font-bold text-gray-900">
                Termos de Serviço & Taxas de Agente
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {propertyTitle || 'Solicitação de Visita Ki-Imóveis'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
            aria-label="Fechar Termos de Serviço"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            Antes de solicitar a sua visita presencial, leia e confirme expressamente os Termos de Serviço e as condições aplicáveis às taxas de mediação dos agentes licenciados Ki-Imóveis.
          </p>

          {/* Fee Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                Visita Presencial
              </span>
              <p className="text-base font-extrabold text-emerald-900 mt-0.5 tabular-nums">
                Grátis (0 Kz)
              </p>
              <span className="text-[11px] text-emerald-700">Sem cobrança antecipada</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Taxa do Agente
              </span>
              <p className="text-base font-extrabold text-amber-900 mt-0.5 tabular-nums">
                {COMMISSIONS.agentCommissionPercent}%
              </p>
              <span className="text-[11px] text-amber-700">
                {estimatedAgentFee
                  ? `≈ ${formatCurrency(estimatedAgentFee)}${propertyStatus === 'rent' ? '/mês' : ''}`
                  : 'No fecho do contrato'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block">
                Mediação Ki-Imóveis
              </span>
              <p className="text-base font-extrabold text-gray-900 mt-0.5 tabular-nums">
                {COMMISSIONS.platformFeePercent}%
              </p>
              <span className="text-[11px] text-gray-500">Segurança documental</span>
            </div>
          </div>

          {/* Scrollable Legal Text */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-2.5 leading-relaxed max-h-44 overflow-y-auto">
            <p>
              <strong>1. Agendamento Gratuito de Visitas:</strong> Solicitar ou realizar uma visita presencial através da Ki-Imóveis é totalmente gratuito e não obriga o cliente à compra ou arrendamento do imóvel.
            </p>
            <p>
              <strong>2. Concordância com a Taxa de Serviço do Agente ({COMMISSIONS.agentCommissionPercent}%):</strong> Caso o utilizador decida avançar com a compra ou arrendamento de um imóvel visitado por intermédio de um agente ou agência Ki-Imóveis, aplica-se a comissão de mediação padrão de {COMMISSIONS.agentCommissionPercent}% sobre o valor contratado, devida apenas após celebração e validação formal do negócio.
            </p>
            <p>
              <strong>3. Taxa da Plataforma & Proteção ao Cliente ({COMMISSIONS.platformFeePercent}%):</strong> A intermediação oficial cobre verificação de licença do agente, rastreamento de visitas e suporte documental, incluindo verificação prévia de Certidão de Registo Predial.
            </p>
            <p>
              <strong>4. Proibição de Pagamentos Antecipados:</strong> Nunca entregue valores em numerário ou transferências a terceiros antes da assinatura de contrato reconhecido e vistoria completa.
            </p>
            <p>
              <strong>5. Comunicações & Notificações:</strong> Ao prosseguir, concorda em receber notificações na plataforma e por e-mail sobre a confirmação ou alteração do estado da sua visita.
            </p>
          </div>

          {/* Explicit Checkbox */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-colors ${
              agreed
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
            }`}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-primary cursor-pointer shrink-0"
            />
            <span className="text-xs font-semibold text-gray-900 leading-relaxed">
              Li e aceito os <strong>Termos de Serviço</strong> da Ki-Imóveis e concordo expressamente com as taxas de serviço do agente ({COMMISSIONS.agentCommissionPercent}%) aplicáveis caso o negócio seja concretizado.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-5 pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 bg-white">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-outline py-2.5 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!agreed}
            onClick={() => {
              if (!agreed) return;
              onAccept();
            }}
            className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
          >
            Concordar e Prosseguir
          </button>
        </div>
      </div>
    </div>
  );
}
