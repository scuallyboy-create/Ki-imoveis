import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { useAuth } from '@/src/hooks/useAuth';
import { GroundedPlaceLink } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  places?: GroundedPlaceLink[];
  modelUsed?: string;
  timestamp: number;
}

const CHAT_STORAGE_KEY = 'ki_imoveis_gemini_chat_v1';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Olá! Sou o assistente imobiliário da Ki-Imóveis. Posso ajudar a escolher zonas em Luanda, Benguela ou Huíla, explicar custos de compra/arrendamento ou pesquisar serviços reais nas redondezas via Google Maps.',
  timestamp: Date.now(),
};

const QUICK_PROMPTS = [
  'Melhores zonas em Luanda para apartamento T3',
  'Escolas e hospitais perto de Talatona',
  'Como funciona o agendamento de visitas?',
];

export default function GeminiChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [WELCOME_MESSAGE];
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore invalid session storage
    }
    return [WELCOME_MESSAGE];
  });

  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Safe ignore
    }
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          fastMode,
          useMapsGrounding,
          lat: -8.839,
          lng: 13.289,
          userName: user?.displayName,
          userRole: user?.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível obter resposta.');
      }

      const modelMsg: ChatMessage = {
        id: 'm-' + Date.now(),
        role: 'model',
        text: data.text,
        places: Array.isArray(data.places) ? data.places : undefined,
        modelUsed: data.model,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro de comunicação com o assistente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
    setErrorMsg(null);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Assistente Ki-Imóveis"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gray-900 text-white shadow-xl hover:bg-brand-primary transition-all cursor-pointer border border-white/10"
        >
          <Icons.Sparkles size={18} className="text-rose-300" />
          <span className="text-sm font-semibold">Assistente IA</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[390px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-5.5rem)] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icons.Sparkles size={18} className="text-rose-300" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">Assistente Ki-Imóveis</p>
                <p className="text-[11px] text-gray-300 truncate">
                  {useMapsGrounding
                    ? 'Conectado ao Google Maps'
                    : fastMode
                    ? 'Modo Rápido'
                    : 'Modo Completo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                title="Nova conversa"
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <Icons.RefreshCw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar assistente"
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <Icons.X size={17} />
              </button>
            </div>
          </div>

          {/* Mode Controls */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 text-[11px] shrink-0">
            <label className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useMapsGrounding}
                onChange={(e) => setUseMapsGrounding(e.target.checked)}
                className="accent-brand-primary cursor-pointer"
              />
              <span>Usar Google Maps</span>
            </label>
            <button
              type="button"
              onClick={() => setFastMode((prev) => !prev)}
              disabled={useMapsGrounding}
              className={cn(
                'px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer disabled:opacity-50',
                fastMode && !useMapsGrounding
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200'
              )}
              title="Alternar velocidade de resposta (desativado quando Google Maps está ativo)"
            >
              {fastMode && !useMapsGrounding ? '⚡ Rápido' : 'Equilibrado'}
            </button>
          </div>

          {/* Scrollable Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col gap-1.5',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-gray-900 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  )}
                >
                  {msg.text}
                </div>

                {msg.places && msg.places.length > 0 && (
                  <div className="max-w-[90%] space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Locais no Google Maps
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.places.slice(0, 5).map((place) => (
                        <a
                          key={place.uri}
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-brand-primary border border-rose-200 text-[11px] font-semibold hover:bg-rose-100"
                        >
                          <Icons.MapPin size={11} />
                          <span className="truncate max-w-[180px]">{place.title}</span>
                          <Icons.ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {messages.length === 1 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-400">Sugestões rápidas:</p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      className="text-left px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:border-brand-primary hover:bg-rose-50/40 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
                <Icons.Loader size={14} className="animate-spin text-brand-primary" />
                <span>A analisar resposta...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {errorMsg}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre imóveis ou zonas..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Enviar mensagem"
              className="p-2.5 rounded-xl bg-brand-primary text-white hover:bg-rose-600 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Icons.Send size={17} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
