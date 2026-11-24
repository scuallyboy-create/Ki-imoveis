import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../components/ui/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { emitDataUpdate } from '../lib/dataService';

export default function BecomePartner() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    fullName: user?.displayName || '',
    nif: '',
    license: '',
    type: 'agent' as 'agent' | 'agency',
    terms: false,
    documentUrl: '',
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setForm((prev) => ({ ...prev, documentUrl: file.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Inicie sessão para submeter a sua candidatura.', 'info');
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('partner_applications').insert({
        userId: user.uid,
        userEmail: user.email,
        fullName: form.fullName,
        nif: form.nif,
        licenseNumber: form.license,
        type: form.type === 'agency' ? 'agency' : 'individual',
        documentUrl: form.documentUrl,
        documents: form.documentUrl ? [form.documentUrl] : [],
        status: 'pending',
        appliedAt: Date.now(),
      });

      if (error) throw error;
      await updateUserProfile({ licenseStatus: 'pending', nif: form.nif });
      emitDataUpdate();
      showToast('Candidatura enviada ao administrador!', 'success');
      setStep(3);
    } catch (err) {
      console.error('Error submitting application:', err);
      showToast('Erro ao submeter candidatura. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 max-w-md mx-auto px-6 text-center">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 professional-shadow space-y-4">
          <Icons.Gem size={36} className="mx-auto text-brand-primary" />
          <h1 className="text-2xl font-bold">Torne-se Parceiro</h1>
          <p className="text-sm text-gray-500">
            Inicie sessão ou crie uma conta antes de enviar a sua candidatura profissional.
          </p>
          <Link to="/auth" className="btn-primary block w-full">
            Entrar / Cadastrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-2xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 sm:p-10 professional-shadow border border-gray-200"
      >
        {step === 1 && (
          <div className="space-y-7">
            <div className="text-center">
              <div className="w-14 h-14 bg-rose-50 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icons.Gem size={28} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Torne-se um Parceiro
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Candidate-se para receber licença profissional verificada pela administração.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'agent' })}
                className={cn(
                  'p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer',
                  form.type === 'agent' ? 'border-brand-primary bg-rose-50/60' : 'border-gray-200'
                )}
              >
                <Icons.User size={22} />
                <span className="font-bold text-sm">Agente Individual</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'agency' })}
                className={cn(
                  'p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer',
                  form.type === 'agency' ? 'border-brand-primary bg-rose-50/60' : 'border-gray-200'
                )}
              >
                <Icons.Building2 size={22} />
                <span className="font-bold text-sm">Agência Imobiliária</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Nome Completo / Denominação Social
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Número de Contribuinte (NIF)
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  placeholder="Ex: 500xxxxxxx"
                  value={form.nif}
                  onChange={(e) => setForm({ ...form, nif: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full btn-primary py-3.5"
                disabled={!form.nif.trim() || !form.fullName.trim()}
              >
                Próximo Passo
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Documentação e Requisitos</h2>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  Bilhete de Identidade / Alvará Comercial
                </p>
                <label
                  className={cn(
                    'flex items-center justify-center py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                    documentFile ? 'border-brand-primary bg-white' : 'border-gray-300 hover:bg-white'
                  )}
                >
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="flex flex-col items-center gap-1 text-gray-500">
                    {documentFile ? (
                      <>
                        <Icons.Check size={22} className="text-brand-primary" />
                        <span className="text-xs font-bold text-brand-primary">
                          {documentFile.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <Icons.Upload size={22} />
                        <span className="text-xs font-semibold">Clique para anexar documento</span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Nº da Carteira Profissional (Opcional)
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  placeholder="Ex: KI-COR-2026-..."
                  value={form.license}
                  onChange={(e) => setForm({ ...form, license: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                  className="mt-1"
                  id="terms"
                />
                <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                  Declaro que todas as informações prestadas são verdadeiras e aceito os termos de parceria da Ki-Imóveis.
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(1)}
                type="button"
                className="flex-1 btn-outline"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={!form.terms || !documentFile || isSubmitting}
              >
                {isSubmitting ? 'A Processar...' : 'Submeter Candidatura'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-8 space-y-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Icons.Clock size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Candidatura Recebida</h2>
              <p className="text-gray-500 text-sm">
                O administrador da Ki-Imóveis irá validar o seu NIF e documento e ativar a sua licença.
              </p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="w-full btn-primary py-3.5">
              Voltar ao Painel
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
