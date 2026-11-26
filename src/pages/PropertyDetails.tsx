import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icons } from '../components/ui/Icons';
import { cn, formatCurrency, getUSDToAOA } from '@/src/lib/utils';
import GooglePropertyMap from '../components/maps/GooglePropertyMap';
import {
  acceptVisitTerms,
  createVisitRequest,
  DATA_UPDATED_EVENT,
  getAgentById,
  getCoordinatesForLocation,
  getPropertyById,
  hasAcceptedVisitTerms,
} from '@/src/lib/dataService';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/components/ui/Toast';
import { useCompare } from '@/src/context/CompareContext';
import { AvailabilityStatus, GroundedPlaceLink } from '@/src/types';
import { safeParseJsonResponse } from '@/src/lib/http';
import AgentFeeTermsBox from '@/src/components/ui/AgentFeeTermsBox';
import TermsOfServiceModal from '@/src/components/ui/TermsOfServiceModal';

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, toggleFavorite } = useAuth();
  const { showToast } = useToast();
  const { isComparing, toggleCompare } = useCompare();

  const [property, setProperty] = useState(() => (id ? getPropertyById(id) : undefined));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [bookingModal, setBookingModal] = useState<'visit' | 'rent' | 'buy' | null>(null);
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('2026-12-10');
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitPhone, setVisitPhone] = useState(user?.phoneNumber || '');
  const [visitMessage, setVisitMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Google Maps Grounding neighborhood insights state
  const [groundingQuery, setGroundingQuery] = useState('');
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<{
    text: string;
    places: GroundedPlaceLink[];
  } | null>(null);
  const [groundingError, setGroundingError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (id) setProperty(getPropertyById(id));
    };
    refresh();
    window.addEventListener(DATA_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, refresh);
  }, [id]);

  if (!property) {
    return (
      <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
        <Icons.Home size={48} className="mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">Imóvel não encontrado</h1>
        <p className="text-gray-500 mt-2 mb-6">
          O imóvel solicitado pode ter sido removido ou não está disponível.
        </p>
        <Link to="/listings" className="btn-primary inline-block">
          Voltar aos Imóveis
        </Link>
      </div>
    );
  }

  const agent = getAgentById(property.agentId);
  const coords =
    property.location.lat && property.location.lng
      ? { lat: property.location.lat, lng: property.location.lng }
      : getCoordinatesForLocation(property.location.province, property.location.city);

  const isFavorite = Boolean(user?.favorites?.includes(property.id));
  const availability: AvailabilityStatus = property.availabilityStatus || 'available';
  const isUnavailable = availability !== 'available';

  const statusText =
    availability === 'available'
      ? 'Disponível'
      : availability === 'sold'
      ? 'Vendido'
      : 'Alugado';

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Ligação do imóvel copiada para a área de transferência!', 'success');
    } catch {
      showToast('Ligação pronta para partilha.', 'info');
    }
  };

  const handleSave = async () => {
    if (!user) {
      showToast('Inicie sessão para guardar imóveis.', 'info');
      navigate('/auth');
      return;
    }
    const added = await toggleFavorite(property.id);
    showToast(added ? 'Imóvel guardado nos favoritos.' : 'Imóvel removido dos favoritos.', 'success');
  };

  const handleOpenBooking = (mode: 'visit' | 'rent' | 'buy') => {
    if (mode === 'visit' && !hasAcceptedVisitTerms(user?.uid)) {
      setTosModalOpen(true);
      return;
    }
    if (!user) {
      showToast('Faça login para agendar visitas ou enviar propostas.', 'info');
      navigate('/auth');
      return;
    }
    setVisitPhone(user.phoneNumber || '');
    setAcceptedTerms(mode === 'visit' ? hasAcceptedVisitTerms(user.uid) : false);
    setBookingModal(mode);
  };

  const handleAcceptVisitTos = () => {
    acceptVisitTerms(user?.uid);
    setTosModalOpen(false);
    if (!user) {
      showToast('Termos de Serviço aceites! Faça login para concluir a solicitação de visita.', 'success');
      navigate('/auth');
      return;
    }
    setVisitPhone(user.phoneNumber || '');
    setAcceptedTerms(true);
    setBookingModal('visit');
    showToast('Termos de Serviço aceites. Selecione a data e hora da sua visita.', 'success');
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookingModal) return;
    if (!acceptedTerms) {
      showToast('Aceite os Termos e Condições da taxa do agente para continuar.', 'error');
      return;
    }
    createVisitRequest({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyImage: property.images[0],
      userId: user.uid,
      userName: user.displayName,
      userEmail: user.email,
      userPhone: visitPhone || user.phoneNumber || '',
      agentId: property.agentId,
      date: visitDate,
      time: visitTime,
      intent: bookingModal,
      message: visitMessage,
      acceptedAgentFeeTerms: true,
      acceptedTermsAt: Date.now(),
    });
    setBookingModal(null);
    setVisitMessage('');
    setAcceptedTerms(false);
    showToast(
      bookingModal === 'visit'
        ? 'Visita agendada com sucesso! Receberá alertas por e-mail sobre a confirmação.'
        : 'Proposta enviada ao agente responsável!',
      'success'
    );
  };

  const handleExploreNeighborhood = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean || groundingLoading) return;
    setGroundingQuery(clean);
    setGroundingLoading(true);
    setGroundingError(null);

    try {
      const res = await fetch('/api/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: clean,
          lat: coords.lat,
          lng: coords.lng,
          propertyTitle: property.title,
          locationLabel: `${property.location.address}, ${property.location.city}, ${property.location.province}, Angola`,
        }),
      });
      const parsed = await safeParseJsonResponse<{
        text?: string;
        places?: GroundedPlaceLink[];
        error?: string;
      }>(res, 'Não foi possível consultar os arredores.');
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.errorMessage || 'Não foi possível consultar os arredores.');
      }
      setGroundingResult({
        text: parsed.data.text || '',
        places: Array.isArray(parsed.data.places) ? parsed.data.places : [],
      });
    } catch (err: any) {
      setGroundingError(err?.message || 'Erro ao pesquisar pontos de interesse.');
    } finally {
      setGroundingLoading(false);
    }
  };

  const galleryImages = property.images.length > 0 ? property.images : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 max-w-7xl mx-auto px-6 md:px-10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
                  availability === 'available'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : availability === 'sold'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                )}
              >
                {availability === 'available' ? (
                  <Icons.CheckCircle2 size={13} />
                ) : availability === 'sold' ? (
                  <Icons.Lock size={13} />
                ) : (
                  <Icons.KeyRound size={13} />
                )}
                {statusText}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {property.location.city}, {property.location.province}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{property.title}</h1>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleCompare(property)}
              className={cn(
                'btn-outline px-4 py-2 text-sm flex items-center gap-2',
                isComparing(property.id) && 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
              )}
            >
              <Icons.ArrowLeftRight size={15} />
              {isComparing(property.id) ? 'Na Comparação' : 'Comparar'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
            >
              <Icons.Share2 size={15} /> Partilhar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                'btn-outline px-4 py-2 text-sm flex items-center gap-2',
                isFavorite && 'border-brand-primary text-brand-primary bg-rose-50'
              )}
            >
              <Icons.Heart size={15} className={isFavorite ? 'fill-current' : ''} />
              {isFavorite ? 'Guardado' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2.5 h-[360px] md:h-[460px] rounded-2xl overflow-hidden bg-gray-100">
          <div
            onClick={() => {
              setGalleryIndex(0);
              setGalleryOpen(true);
            }}
            className="md:col-span-2 md:row-span-2 relative overflow-hidden cursor-pointer"
          >
            {galleryImages[0] && (
              <img
                src={galleryImages[0]}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:brightness-95 transition-all"
                alt={property.title}
              />
            )}
          </div>
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              onClick={() => {
                setGalleryIndex(galleryImages[idx] ? idx : 0);
                setGalleryOpen(true);
              }}
              className="hidden md:block relative overflow-hidden cursor-pointer bg-gray-200"
            >
              <img
                src={galleryImages[idx] || galleryImages[0]}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover hover:brightness-95 transition-all"
                alt={`${property.title} - foto ${idx + 1}`}
              />
            </div>
          ))}
          <div className="hidden md:block relative overflow-hidden bg-gray-200">
            <img
              src={galleryImages[4] || galleryImages[0]}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover brightness-75"
              alt="Mais fotos"
            />
            <button
              type="button"
              onClick={() => {
                setGalleryIndex(0);
                setGalleryOpen(true);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer"
            >
              <span className="bg-white px-4 py-2 rounded-xl text-xs font-bold shadow-md text-gray-900">
                Ver todas fotos ({galleryImages.length})
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-4">
          <div className="lg:col-span-2 space-y-8">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold mb-2">
                Imóvel em {property.location.city}, {property.location.province}
              </h2>
              <p className="text-gray-600 text-sm tabular-nums">
                {property.details.bedrooms} quartos · {property.details.bathrooms} casas de banho ·{' '}
                {property.details.area} m² ·{' '}
                {property.details.furnished ? 'Mobilado' : 'Sem mobília'}
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6 space-y-4">
              <h3 className="font-bold text-lg">Sobre este imóvel</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="font-bold text-lg mb-4">Comodidades incluídas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Icons.Check size={16} className="text-brand-primary shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-4">Localização no Mapa (Google Maps)</h3>
                <GooglePropertyMap
                  properties={[property]}
                  center={coords}
                  zoom={15}
                  heightClassName="h-[360px]"
                  selectedPropertyId={property.id}
                  showPropertyLink={false}
                />
                <p className="mt-3 text-gray-500 text-sm flex items-center gap-1.5">
                  <Icons.MapPin size={15} />
                  <span>
                    {property.location.address}, {property.location.city}, {property.location.province}
                  </span>
                </p>
              </div>

              {/* Google Maps Grounding Neighborhood Explorer */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
                      <Icons.Sparkles size={17} className="text-brand-primary" />
                      <span>Explorar Arredores com Google Maps</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Descubra escolas, clínicas, restaurantes e acessos reais próximos deste imóvel.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    'Escolas e universidades próximas',
                    'Supermercados e farmácias por perto',
                    'Hospitais e clínicas nas imediações',
                    'Restaurantes e zonas de lazer',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={groundingLoading}
                      onClick={() => void handleExploreNeighborhood(preset)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:border-brand-primary hover:bg-rose-50/40 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleExploreNeighborhood(groundingQuery);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={groundingQuery}
                    onChange={(e) => setGroundingQuery(e.target.value)}
                    placeholder="Ex: Bancos, transportes ou praias perto..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={!groundingQuery.trim() || groundingLoading}
                    className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {groundingLoading ? (
                      <Icons.Loader size={14} className="animate-spin" />
                    ) : (
                      <Icons.Search size={14} />
                    )}
                    <span>Pesquisar</span>
                  </button>
                </form>

                {groundingError && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    {groundingError}
                  </p>
                )}

                {groundingResult && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    {groundingResult.text && (
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {groundingResult.text}
                      </p>
                    )}

                    {groundingResult.places.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Fontes verificadas no Google Maps
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {groundingResult.places.map((place) => (
                            <a
                              key={place.uri}
                              href={place.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col justify-between gap-1.5 p-3 rounded-2xl border border-gray-200 hover:border-brand-primary hover:bg-rose-50/30 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-gray-900 truncate">
                                  {place.title}
                                </span>
                                <Icons.ExternalLink size={13} className="text-brand-primary shrink-0" />
                              </div>
                              {place.reviewSnippets?.[0]?.text && (
                                <p className="text-[11px] text-gray-500 line-clamp-2 italic">
                                  "{place.reviewSnippets[0].text}"
                                </p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action / Booking Card */}
          <div>
            <div className="sticky top-28 bg-white border border-gray-200 rounded-3xl p-6 professional-shadow space-y-6">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
                    {formatCurrency(property.price)}
                  </span>
                  {property.status === 'rent' && (
                    <span className="text-gray-500 text-sm ml-1">/mês</span>
                  )}
                  <p className="text-xs text-gray-400 font-mono tabular-nums mt-1">
                    ≈ {formatCurrency(getUSDToAOA(property.price), 'USD')}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-gray-500">
                  {property.status === 'rent' ? 'Arrendamento' : 'Venda'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => handleOpenBooking(property.status === 'rent' ? 'rent' : 'buy')}
                  className="w-full btn-primary py-3.5 text-base bg-brand-dark hover:bg-gray-800"
                >
                  {isUnavailable
                    ? `Imóvel ${statusText}`
                    : property.status === 'rent'
                    ? 'Solicitar Arrendamento'
                    : 'Enviar Proposta de Compra'}
                </button>
                <button
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => handleOpenBooking('visit')}
                  className="w-full btn-outline py-3 text-sm font-semibold"
                >
                  Solicitar Visita
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                {isUnavailable
                  ? 'Este imóvel já não aceita novas visitas.'
                  : 'Sem custos antecipados · Resposta direta do agente.'}
              </p>

              {agent && (
                <Link
                  to={`/agents/${agent.id}`}
                  className="pt-5 border-t border-gray-100 flex items-center gap-3.5 group"
                >
                  <img
                    src={agent.image}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    alt={agent.name}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate group-hover:text-brand-primary transition-colors">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {agent.type === 'agency' ? 'Agência Verificada' : 'Agente Imobiliário'}
                    </p>
                  </div>
                  <Icons.ChevronRight size={18} className="text-gray-400 group-hover:text-brand-primary" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setGalleryOpen(false)}
            className="absolute top-5 right-5 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full cursor-pointer"
            aria-label="Fechar galeria"
          >
            <Icons.X size={22} />
          </button>
          <div className="relative max-w-4xl w-full flex items-center justify-center">
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)
                }
                className="absolute left-2 sm:-left-12 text-white bg-white/15 hover:bg-white/25 p-3 rounded-full cursor-pointer"
                aria-label="Foto anterior"
              >
                <Icons.ChevronLeft size={22} />
              </button>
            )}
            <img
              src={galleryImages[galleryIndex]}
              referrerPolicy="no-referrer"
              alt={`Foto ${galleryIndex + 1}`}
              className="max-h-[75vh] w-auto rounded-2xl object-contain"
            />
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => setGalleryIndex((i) => (i + 1) % galleryImages.length)}
                className="absolute right-2 sm:-right-12 text-white bg-white/15 hover:bg-white/25 p-3 rounded-full cursor-pointer"
                aria-label="Próxima foto"
              >
                <Icons.ChevronRight size={22} />
              </button>
            )}
          </div>
          <p className="text-white/70 text-xs mt-4 tabular-nums">
            {galleryIndex + 1} / {galleryImages.length}
          </p>
        </div>
      )}

      {/* Booking / Visit Modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {bookingModal === 'visit'
                  ? 'Agendar Visita'
                  : bookingModal === 'rent'
                  ? 'Solicitar Arrendamento'
                  : 'Proposta de Compra'}
              </h3>
              <button
                type="button"
                onClick={() => setBookingModal(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="input-field py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="input-field py-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+244 9XX XXX XXX"
                  value={visitPhone}
                  onChange={(e) => setVisitPhone(e.target.value)}
                  className="input-field py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                  Mensagem para o agente
                </label>
                <textarea
                  rows={3}
                  placeholder="Indique dúvidas ou horários alternativos..."
                  value={visitMessage}
                  onChange={(e) => setVisitMessage(e.target.value)}
                  className="input-field py-2.5 text-sm"
                />
              </div>

              <AgentFeeTermsBox
                accepted={acceptedTerms}
                onChange={setAcceptedTerms}
                estimatedPrice={property.price}
                contextLabel={
                  bookingModal === 'buy'
                    ? 'esta proposta de compra'
                    : bookingModal === 'rent'
                    ? 'este pedido de arrendamento'
                    : 'este agendamento de visita'
                }
                compact
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModal(null)}
                  className="flex-1 btn-outline py-2.5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!acceptedTerms}
                  className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TermsOfServiceModal
        isOpen={tosModalOpen}
        onAccept={handleAcceptVisitTos}
        onCancel={() => setTosModalOpen(false)}
        propertyTitle={property.title}
        estimatedPrice={property.price}
        propertyStatus={property.status}
      />
    </motion.div>
  );
}
