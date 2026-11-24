import { motion } from 'motion/react';
import { ASSETS } from '@/src/lib/assets';
import SearchEngineBar from './SearchEngineBar';

export default function Hero() {
  return (
    <div className="relative h-[86vh] min-h-[640px] w-full flex items-center justify-center">
      {/* Background Image with Contrast Scrim */}
      <div className="absolute inset-0 overflow-hidden bg-gray-900">
        <img
          src={ASSETS.heroLuandaLuxury}
          alt="Terraço residencial de luxo com vista para a Baía de Luanda"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/35" />
      </div>

      <div className="relative z-20 w-full max-w-5xl px-6 flex flex-col items-center pt-12">
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-10 max-w-2xl"
        >
          <span className="font-serif italic text-white/90 text-xl mb-3 block">
            Imobiliário verificado em Angola
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white leading-tight [text-wrap:balance]">
            Encontre o imóvel certo no lugar certo
          </h1>
        </motion.div>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
          className="w-full"
        >
          <SearchEngineBar />
        </motion.div>
      </div>
    </div>
  );
}
