import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { cropSquareAvatarDataUrl } from '@/src/lib/dataService';
import { useToast } from '../ui/Toast';

interface ProfilePhotoModalProps {
  currentPhoto?: string;
  displayName: string;
  onSave: (dataUrl: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export default function ProfilePhotoModal({
  currentPhoto,
  displayName,
  onSave,
  onRemove,
  onClose,
}: ProfilePhotoModalProps) {
  const { showToast } = useToast();
  const [sourceImage, setSourceImage] = useState<string>(currentPhoto || '');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione um ficheiro de imagem válido (JPG, PNG, WebP).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSourceImage(reader.result as string);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    if (!sourceImage) return;
    setSaving(true);
    try {
      const cropped = await cropSquareAvatarDataUrl(sourceImage, zoom, offsetX, offsetY, 256);
      await onSave(cropped);
      showToast('Foto de perfil atualizada com sucesso!', 'success');
      onClose();
    } catch {
      showToast('Erro ao processar a foto de perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    try {
      await onRemove();
      showToast('Foto de perfil removida.', 'info');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Alterar Foto de Perfil</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Carregue uma foto e ajuste o enquadramento antes de guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Circular Live Preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-100 shadow-inner bg-gray-100 flex items-center justify-center relative">
            {sourceImage ? (
              <img
                src={sourceImage}
                alt={displayName}
                className="w-full h-full object-cover select-none"
                style={{
                  transform: `scale(${zoom}) translate(${-offsetX * 0.22}%, ${-offsetY * 0.22}%)`,
                }}
              />
            ) : (
              <Icons.User size={48} className="text-gray-400" />
            )}
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer transition-colors">
            <Icons.Upload size={14} />
            <span>{sourceImage ? 'Escolher Outra Foto' : 'Carregar Foto'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFilePick}
              className="hidden"
            />
          </label>
        </div>

        {sourceImage && (
          <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div>
              <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                <span>Zoom</span>
                <span className="tabular-nums">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-brand-primary cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Horizontal
                </span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={offsetX}
                  onChange={(e) => setOffsetX(Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Vertical
                </span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={offsetY}
                  onChange={(e) => setOffsetY(Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          {currentPhoto && (
            <button
              type="button"
              disabled={saving}
              onClick={handleRemovePhoto}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
            >
              Remover
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-outline py-2.5 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!sourceImage || saving}
            onClick={handleConfirm}
            className="flex-1 btn-primary py-2.5 text-sm"
          >
            {saving ? 'A guardar...' : 'Guardar Foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
