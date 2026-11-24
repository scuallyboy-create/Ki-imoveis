import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../components/ui/Icons';
import { AMENITIES, CATEGORIES, PROVINCES } from '@/src/constants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { cn, formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import {
  addProperty,
  compressImageFile,
  getAllAgents,
  getCoordinatesForLocation,
  getProperties,
} from '../lib/dataService';
import { useToast } from '../components/ui/Toast';

export default function SubmitRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const preselectedAgentId = searchParams.get('agentId');
  const agents = getAllAgents();

  const [step, setStep] = useState(1);
  const [publishMode, setPublishMode] = useState<'direct' | 'agent'>(
    user && user.role !== 'user' ? 'direct' : 'agent'
  );
  const [selectedAgent, setSelectedAgent] = useState<any>(() =>
    preselectedAgentId ? agents.find((a) => a.id === preselectedAgentId) || agents[0] : agents[0]
  );

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: 'Talatona',
    address: '',
    province: 'Luanda',
    propertyType: 'apartment' as 'apartment' | 'house' | 'luxury' | 'commercial',
    transactionType: 'sale' as 'sale' | 'rent',
    price: '45000000',
    bedrooms: '3',
    bathrooms: '2',
    area: '140',
    furnished: true,
    amenities: ['Estacionamento', 'Segurança 24h'] as string[],
    phone: user?.phoneNumber || '',
    notificationMethod: 'whatsapp',
  });

  useEffect(() => {
    if (user?.phoneNumber && !formData.phone) {
      setFormData((prev) => ({ ...prev, phone: user.phoneNumber || '' }));
    }
    if (user && user.role !== 'user' && !preselectedAgentId) {
      setPublishMode('direct');
    }
  }, [user, preselectedAgentId]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const ownPropertiesCount = user
    ? getProperties().filter((p) => p.agentId === user.uid || p.ownerId === user.uid).length
    : 0;
  const maxAllowed = user?.permissions?.maxListings ?? 10;
  const isSuspended = user?.licenseStatus === 'suspended' || user?.licenseStatus === 'expired';
  const quotaReached =
    publishMode === 'direct' && maxAllowed !== -1 && ownPropertiesCount >= maxAllowed;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 9 - uploadedImages.length;
    if (remainingSlots <= 0) {
      showToast('Limite máximo de 9 fotos atingido.', 'info');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setUploadingPhotos(true);
    try {
      const compressed = await Promise.all(
        filesToProcess.map((f) => compressImageFile(f, 1200, 0.8))
      );
      setUploadedImages((prev) => [...prev, ...compressed]);
      showToast(`${compressed.length} foto(s) carregada(s) com sucesso.`, 'success');
    } catch {
      showToast('Erro ao processar uma ou mais imagens.', 'error');
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    setUploadedImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      return [chosen, ...next];
    });
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Faça login para publicar um imóvel.', 'info');
      navigate('/auth');
      return;
    }

    if (isSuspended) {
      showToast('A sua licença está suspensa ou expirada. Contacte o administrador.', 'error');
      return;
    }

    if (quotaReached) {
      showToast(
        `Atingiu o limite de ${maxAllowed} imóveis do seu plano. Solicite um upgrade.`,
        'error'
      );
      return;
    }

    if (uploadedImages.length === 0) {
      showToast('Carregue pelo menos 1 foto do imóvel antes de continuar.', 'error');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const coords = getCoordinatesForLocation(formData.province, formData.city);

      if (publishMode === 'direct') {
        addProperty({
          title: formData.title.trim(),
          description: formData.description.trim() || 'Imóvel verificado na plataforma Ki-Imóveis.',
          price: Number(formData.price) || 100000,
          type: formData.propertyType,
          category: formData.propertyType === 'luxury' ? 'luxury' : 'featured',
          location: {
            province: formData.province,
            city: formData.city.trim() || formData.province,
            address: formData.address.trim(),
            lat: coords.lat,
            lng: coords.lng,
          },
          details: {
            bedrooms: Number(formData.bedrooms) || 1,
            bathrooms: Number(formData.bathrooms) || 1,
            area: Number(formData.area) || 80,
            furnished: formData.furnished,
          },
          amenities: formData.amenities,
          images: uploadedImages,
          agentId: user.uid,
          ownerId: user.uid,
          status: formData.transactionType,
          availabilityStatus: 'available',
          isVerified: Boolean(user.verified || user.role === 'admin'),
          rating: 5.0,
        });
      } else {
        const { error } = await supabase.from('property_requests').insert({
          ownerId: user.uid,
          ownerName: user.displayName || user.email,
          ownerEmail: user.email,
          ownerPhone: formData.phone,
          propertyTitle: formData.title,
          propertyDescription: formData.description,
          location: formData.province,
          address: `${formData.city}, ${formData.address}`,
          propertyType: formData.propertyType,
          estimatedValue: Number(formData.price) || undefined,
          propertyImages: uploadedImages,
          assignedAgentId: selectedAgent?.id || 'a1',
          notificationMethod: formData.notificationMethod,
          status: 'pending',
          createdAt: Date.now(),
        });
        if (error) throw error;
      }

      setStep(4);
      showToast(
        publishMode === 'direct'
          ? 'Imóvel publicado com sucesso!'
          : 'Solicitação enviada ao agente escolhido!',
        'success'
      );
    } catch (err) {
      console.error('Error submitting property:', err);
      showToast('Erro ao publicar imóvel. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-50 px-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center border border-gray-200 professional-shadow space-y-4">
          <Icons.Lock size={36} className="mx-auto text-brand-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Inicie sessão para publicar</h1>
          <p className="text-sm text-gray-500">
            Para publicar imóveis ou enviar pedidos aos nossos agentes, entre na sua conta.
          </p>
          <Link to="/auth" className="btn-primary inline-block w-full">
            Entrar / Cadastrar
          </Link>
        </div>
      </div>
    );
  }

  if (user.role === 'admin') {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-50 px-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 text-center border border-gray-200 professional-shadow space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mx-auto">
            <Icons.Shield size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil Exclusivo de Gestão</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            A conta de administração (<strong>{user.email}</strong>) destina-se apenas à gestão da
            plataforma, avaliação de agentes e validação de licenças, não podendo publicar imóveis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to="/dashboard?tab=admin" className="flex-1 btn-primary py-3 text-sm">
              Gerir Licenças & Avaliar Agentes
            </Link>
            <Link to="/dashboard?tab=listings" className="flex-1 btn-outline py-3 text-sm">
              Moderar Catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 bg-gray-50 px-4 sm:px-6 flex items-center justify-center">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-3xl bg-white rounded-3xl professional-shadow border border-gray-200 overflow-hidden p-6 sm:p-10"
      >
        {step < 4 && (
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all tabular-nums',
                    step === i
                      ? 'bg-brand-primary text-white scale-110 shadow-sm'
                      : step > i
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {step > i ? '✓' : i}
                </div>
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Publicar Imóvel
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Adicione fotos reais, detalhes dos compartimentos e localização.
            </p>
          </div>
        )}

        {isSuspended && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm">
            A sua licença encontra-se <strong>{user.licenseStatus}</strong>. Contacte o administrador para reativar publicações.
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Modalidade
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  {[
                    { id: 'sale', label: 'Venda' },
                    { id: 'rent', label: 'Arrendamento' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, transactionType: m.id as any })}
                      className={cn(
                        'py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        formData.transactionType === m.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Tipo de Imóvel
                </label>
                <select
                  className="input-field py-2.5 text-sm"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as any })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Província
                </label>
                <select
                  className="input-field py-2.5 text-sm"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Cidade / Município
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  placeholder="Ex: Talatona"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Endereço / Bairro
                </label>
                <input
                  className="input-field py-2.5 text-sm"
                  placeholder="Rua ou condomínio"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Preço (AOA)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-field py-2.5 text-sm tabular-nums"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Quartos
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  className="input-field py-2.5 text-sm tabular-nums"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Casas de Banho
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  className="input-field py-2.5 text-sm tabular-nums"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Área (m²)
                </label>
                <input
                  type="number"
                  min={10}
                  className="input-field py-2.5 text-sm tabular-nums"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
            </div>

            {/* Real Multi-Photo Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Fotos do Imóvel ({uploadedImages.length}/9)
                </label>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer transition-colors">
                  {uploadingPhotos ? (
                    <Icons.Loader size={14} className="animate-spin" />
                  ) : (
                    <Icons.Upload size={14} />
                  )}
                  <span>{uploadingPhotos ? 'A carregar...' : 'Carregar Fotos'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {uploadedImages.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-100"
                  >
                    <img
                      src={src}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/75 text-white text-[10px] font-bold rounded">
                        Capa
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx !== 0 ? (
                        <button
                          type="button"
                          onClick={() => setAsCover(idx)}
                          className="text-[10px] text-white font-semibold underline cursor-pointer"
                        >
                          Capa
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="p-1 bg-rose-600 text-white rounded-md cursor-pointer"
                        aria-label="Remover foto"
                      >
                        <Icons.Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {uploadedImages.length < 9 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-gray-500 p-2 text-center">
                    <Icons.Camera size={20} className="mb-1 text-gray-400" />
                    <span className="text-[11px] font-semibold">Adicionar</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Título do Anúncio
              </label>
              <input
                className="input-field py-2.5 text-sm"
                placeholder="Ex: Apartamento T3 no Condomínio Jardim de Rosas"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Descrição
              </label>
              <textarea
                className="input-field min-h-[90px] text-sm"
                placeholder="Descreva os acabamentos, área envolvente e condições..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Comodidades
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((am) => {
                  const active = formData.amenities.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenity(am)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                        active
                          ? 'bg-brand-dark text-white border-brand-dark'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {am}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (uploadedImages.length === 0) {
                  showToast('Por favor carregue pelo menos 1 foto do imóvel.', 'error');
                  return;
                }
                setStep(2);
              }}
              className="w-full btn-primary py-3.5"
              disabled={!formData.title.trim() || !formData.address.trim()}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Forma de Publicação</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPublishMode('direct')}
                className={cn(
                  'p-5 rounded-2xl border-2 text-left transition-all cursor-pointer',
                  publishMode === 'direct'
                    ? 'border-brand-primary bg-rose-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-bold text-gray-900">Publicar Diretamente</p>
                <p className="text-xs text-gray-500 mt-1">
                  O imóvel entra imediatamente no catálogo e no seu Painel (Meus Imóveis).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPublishMode('agent')}
                className={cn(
                  'p-5 rounded-2xl border-2 text-left transition-all cursor-pointer',
                  publishMode === 'agent'
                    ? 'border-brand-primary bg-rose-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-bold text-gray-900">Solicitar Agente Parceiro</p>
                <p className="text-xs text-gray-500 mt-1">
                  Um agente verificado trata da avaliação, visitas e contrato por si.
                </p>
              </button>
            </div>

            {publishMode === 'agent' && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-gray-500">
                  Escolha o agente responsável
                </p>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgent(agent)}
                    className={cn(
                      'w-full p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between text-left',
                      selectedAgent?.id === agent.id
                        ? 'border-brand-primary bg-rose-50/40'
                        : 'border-gray-100 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={agent.image}
                        referrerPolicy="no-referrer"
                        alt={agent.name}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-bold text-sm text-gray-900">{agent.name}</p>
                        <p className="text-xs text-gray-500">
                          {agent.location} · Avaliação {agent.rating} ★
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-primary">3% taxa</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(1)} className="flex-1 btn-outline">
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 btn-primary"
                disabled={publishMode === 'agent' && !selectedAgent}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Resumo e Contacto</h2>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-2 text-sm">
              <p className="font-bold text-gray-900">{formData.title}</p>
              <p className="text-gray-600">
                {formData.city}, {formData.province} · T{formData.bedrooms} · {formData.area} m²
              </p>
              <p className="font-bold text-brand-primary tabular-nums">
                {formatCurrency(Number(formData.price) || 0)}
                {formData.transactionType === 'rent' ? ' /mês' : ''}
              </p>
              <p className="text-xs text-gray-500">{uploadedImages.length} foto(s) pronta(s)</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Seu WhatsApp / Telefone
              </label>
              <input
                required
                className="input-field py-2.5 text-sm"
                placeholder="+244 9XX XXX XXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                Preferência de Notificação
              </label>
              <div className="flex gap-3">
                {['whatsapp', 'email', 'site'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({ ...formData, notificationMethod: m })}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-xs font-bold capitalize cursor-pointer',
                      formData.notificationMethod === m
                        ? 'border-brand-dark bg-brand-dark text-white'
                        : 'border-gray-200 text-gray-700'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(2)} className="flex-1 btn-outline">
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={!formData.phone || isSubmitting || isSuspended || quotaReached}
              >
                {isSubmitting
                  ? 'A processar...'
                  : publishMode === 'direct'
                  ? 'Publicar Agora'
                  : 'Enviar Solicitação'}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8 space-y-5"
          >
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Icons.Check size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {publishMode === 'direct' ? 'Imóvel Publicado!' : 'Solicitação Enviada!'}
            </h2>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              {publishMode === 'direct'
                ? 'O seu imóvel já está disponível na pesquisa e visível no seu painel.'
                : `${selectedAgent?.name} recebeu o seu pedido e entrará em contacto via ${formData.notificationMethod}.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-primary px-8"
              >
                Ir para o Painel
              </button>
              <button
                type="button"
                onClick={() => navigate('/listings')}
                className="btn-outline px-8"
              >
                Ver Imóveis
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
