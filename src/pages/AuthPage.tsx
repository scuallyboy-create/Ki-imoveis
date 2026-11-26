import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../components/ui/Icons';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DATA_UPDATED_EVENT, getPlanCatalog } from '../lib/dataService';
import { PlanCatalogItem, SubscriptionPlan } from '../types';
import { useToast } from '../components/ui/Toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn, signUp, signOut, resetPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') as SubscriptionPlan | null;
  const [planCatalog, setPlanCatalog] = useState<Record<SubscriptionPlan, PlanCatalogItem>>(() =>
    getPlanCatalog()
  );

  useEffect(() => {
    const sync = () => setPlanCatalog(getPlanCatalog());
    window.addEventListener(DATA_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const [role, setRole] = useState<'user' | 'agent'>(
    planParam && planParam !== 'free' ? 'agent' : 'user'
  );

  const handleAuth = async (e?: FormEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setError('');
    setInfoMsg('');
    setIsSubmitting(true);

    try {
      if (forgotMode) {
        if (!email.trim()) {
          setError('Introduza o seu e-mail para recuperar a palavra-passe.');
          setIsSubmitting(false);
          return;
        }
        await resetPassword(email.trim());
        setInfoMsg('Enviámos as instruções de recuperação para o seu e-mail.');
        showToast('Instruções enviadas para o seu e-mail.', 'success');
        setForgotMode(false);
      } else if (isLogin) {
        if (!email.trim() || !password) {
          setError('Por favor, preencha o e-mail e a palavra-passe.');
          setIsSubmitting(false);
          return;
        }
        await signIn(email.trim(), password);
        showToast('Sessão iniciada com sucesso!', 'success');
        navigate('/dashboard');
      } else {
        if (!email.trim() || !password || !displayName.trim()) {
          setError('Por favor, preencha todos os campos para o cadastro.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('A palavra-passe deve ter pelo menos 6 caracteres.');
          setIsSubmitting(false);
          return;
        }
        const metadata = planParam ? { subscriptionPlan: planParam } : {};
        await signUp(email.trim(), password, displayName.trim(), role, metadata);
        showToast('Conta criada com sucesso! Bem-vindo à Ki-Imóveis.', 'success');
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('E-mail ou palavra-passe incorretos. Tente novamente.');
      } else if (msg.includes('User already registered')) {
        setError('Este e-mail já está registado. Tente entrar na sua conta.');
      } else if (msg.toLowerCase().includes('is invalid') || msg.includes('email_address_invalid')) {
        setError('Endereço de e-mail inválido. Use um e-mail válido (ex: nome@gmail.com).');
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.');
      } else {
        setError(msg || 'Ocorreu um erro na autenticação.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center bg-gray-50 px-6">
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-3xl professional-shadow border border-gray-200 overflow-hidden"
      >
        {user && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-3 text-xs text-amber-900">
            <span className="truncate">
              Sessão ativa: <strong>{user.email}</strong>
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="font-bold underline shrink-0 cursor-pointer"
            >
              Terminar Sessão
            </button>
          </div>
        )}

        {planParam && planCatalog[planParam] && (
          <div className="bg-rose-50 border-b border-rose-100 px-6 py-3 text-xs text-rose-900 font-semibold text-center">
            Pacote selecionado: {planCatalog[planParam].name} ({planCatalog[planParam].priceLabel})
          </div>
        )}

        {!isLogin && !forgotMode && (
          <div className="bg-brand-dark p-2 flex gap-1">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={cn(
                'flex-1 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer',
                role === 'user' ? 'bg-white text-brand-dark' : 'text-white/60'
              )}
            >
              SOU CLIENTE
            </button>
            <button
              type="button"
              onClick={() => setRole('agent')}
              className={cn(
                'flex-1 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer',
                role === 'agent' ? 'bg-white text-brand-dark' : 'text-white/60'
              )}
            >
              SOU AGENTE / AGÊNCIA
            </button>
          </div>
        )}

        {!forgotMode && (
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={cn(
                'flex-1 py-5 text-sm font-bold transition-all cursor-pointer',
                isLogin ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400'
              )}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={cn(
                'flex-1 py-5 text-sm font-bold transition-all cursor-pointer',
                !isLogin ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400'
              )}
            >
              Cadastrar
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="p-8 space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {forgotMode
                ? 'Recuperar Palavra-passe'
                : isLogin
                ? 'Bem-vindo de volta'
                : 'Crie a sua conta'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Explore os melhores imóveis verificados em Angola
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
              {error}
            </div>
          )}
          {infoMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
              {infoMsg}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && !forgotMode && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Nome Completo
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                E-mail
              </label>
              <input
                type="email"
                className="input-field py-2.5 text-sm"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {!forgotMode && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Palavra-passe
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
            )}

            {isLogin && !forgotMode && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                  }}
                  className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Icons.Loader className="w-5 h-5 animate-spin" />
                <span>A processar...</span>
              </>
            ) : (
              <span>
                {forgotMode ? 'Enviar recuperação' : isLogin ? 'Entrar' : 'Cadastrar'}
              </span>
            )}
          </button>

          {forgotMode && (
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-xs font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              ← Voltar ao login
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
