import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fileToSquareDataUrl } from '../utils/image';

interface ImageUploadFieldProps {
  image?: string;
  onChange: (image: string | undefined) => void;
}

export function ImageUploadField({ image, onChange }: ImageUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await fileToSquareDataUrl(file));
      setError(false);
    } catch {
      setError(true);
    }
  };

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{t('common.image.label')}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 bg-bg-dark hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors border border-gray-700 text-sm"
        >
          <ImagePlus size={14} />
          {image ? t('common.image.change') : t('common.image.upload')}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 px-2 py-2 rounded-lg transition-colors text-sm"
          >
            <Trash2 size={14} />
            {t('common.image.remove')}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      <p className={`text-xs mt-1 ${error ? 'text-red-400' : 'text-gray-500'}`}>
        {error ? t('common.image.error') : t('common.image.hint')}
      </p>
    </div>
  );
}
