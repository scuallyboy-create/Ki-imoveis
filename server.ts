import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function extractGeminiError(err: any, fallback: string): { status: number; message: string } {
  const rawMsg = typeof err?.message === 'string' ? err.message : '';
  try {
    const parsed = JSON.parse(rawMsg);
    const code = Number(parsed?.error?.code) || 502;
    const innerMsg = parsed?.error?.message || fallback;
    if (code === 429) {
      return {
        status: 429,
        message: 'Limite temporário de pedidos ao assistente atingido. Aguarde alguns segundos e tente novamente.',
      };
    }
    if (code === 503) {
      return {
        status: 503,
        message: 'O modelo Gemini está com elevada procura neste momento. Tente novamente dentro de instantes.',
      };
    }
    return { status: code >= 400 && code < 600 ? code : 502, message: innerMsg };
  } catch {
    return { status: 502, message: rawMsg || fallback };
  }
}

interface ExtractedPlace {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: { author?: string; text: string; uri?: string }[];
}

function extractGroundedPlaces(response: any): ExtractedPlace[] {
  const chunks: any[] = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const places: ExtractedPlace[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.maps?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const snippets = Array.isArray(chunk?.maps?.placeAnswerSources?.reviewSnippets)
      ? chunk.maps.placeAnswerSources.reviewSnippets
          .map((s: any) => ({
            author: s?.authorAttribution?.displayName || undefined,
            text: typeof s?.text === 'string' ? s.text : typeof s?.content === 'string' ? s.content : '',
            uri: s?.googleMapsUri || undefined,
          }))
          .filter((s: any) => Boolean(s.text))
      : [];

    places.push({
      title: chunk.maps.title || 'Local no Google Maps',
      uri,
      placeId: chunk.maps.placeId || undefined,
      ...(snippets.length > 0 ? { reviewSnippets: snippets } : {}),
    });
  }

  return places;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      emailConfigured: Boolean(
        (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
          process.env.RESEND_API_KEY
      ),
    });
  });

  // Multi-turn Gemini Chatbot Endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY não está configurada no servidor.',
      });
      return;
    }

    const {
      message,
      history,
      fastMode,
      useMapsGrounding,
      lat,
      lng,
      userName,
      userRole,
    } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'A mensagem é obrigatória.' });
      return;
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item: any) =>
              item &&
              (item.role === 'user' || item.role === 'model') &&
              typeof item.text === 'string' &&
              item.text.trim().length > 0
          )
          .slice(-20)
          .map((item: any) => ({
            role: item.role as 'user' | 'model',
            parts: [{ text: item.text.trim() }],
          }))
      : [];

    const wantsMaps = Boolean(useMapsGrounding);
    const model = fastMode && !wantsMaps ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

    const userContext =
      userName || userRole
        ? `\nContexto do utilizador autenticado: Nome=${String(userName || 'Visitante')}, Perfil=${String(userRole || 'user')}.`
        : '';

    const systemInstruction = `Você é o Assistente Imobiliário oficial da Ki-Imóveis em Angola.
Responda sempre em Português (de Angola / Portugal), de forma clara, objetiva e prestável.
Ajude compradores, inquilinos, proprietários e agentes com:
- Pesquisa de imóveis em províncias angolanas (Luanda — Talatona, Miramar, Mussulo, Viana, Kilamba; Benguela — Praia Morena, Lobito; Huíla — Lubango; Cabinda; Namibe).
- Comparação de preços em Kwanzas (AOA), tipologias (T1, T2, T3, T4+), compra vs. arrendamento e documentação habitual em Angola (escritura, contrato de arrendamento, registo predial).
- Agendamento de visitas na plataforma, planos de licenciamento (Essencial, Silver Pro, Gold Elite) e acompanhamento de alertas por e-mail.
Nunca invente endereços ou preços específicos que não tenham sido fornecidos ou fundamentados pelo Google Maps.${userContext}`;

    try {
      const hasCoords =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng);

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
          ...(wantsMaps
            ? {
                tools: [{ googleMaps: {} }],
                ...(hasCoords
                  ? {
                      toolConfig: {
                        retrievalConfig: {
                          latLng: { latitude: lat, longitude: lng },
                        },
                      },
                    }
                  : {}),
              }
            : {}),
        },
        history: safeHistory,
      });

      const response = await chat.sendMessage({ message: message.trim() });
      const places = wantsMaps ? extractGroundedPlaces(response) : [];

      res.json({
        text: response.text || 'Não foi possível gerar resposta neste momento.',
        model,
        places,
      });
    } catch (err: any) {
      const friendly = extractGeminiError(err, 'Erro ao comunicar com o modelo Gemini.');
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  // Google Maps Grounding Endpoint (Neighborhood & POI Insights)
  app.post('/api/maps-grounding', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY não está configurada no servidor.',
      });
      return;
    }

    const { query, lat, lng, propertyTitle, locationLabel } = req.body || {};
    if (typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Indique o que pretende pesquisar nas proximidades.' });
      return;
    }

    const hasCoords =
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    const prompt = `Responde em Português de forma prática e estruturada.
Imóvel em análise: ${String(propertyTitle || 'Imóvel Ki-Imóveis')} (${String(locationLabel || 'Angola')}).
Pedido do utilizador: ${query.trim()}
Identifica locais reais, serviços, acessos ou pontos de interesse relevantes nas proximidades com base nos dados do Google Maps.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          ...(hasCoords
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: { latitude: lat, longitude: lng },
                  },
                },
              }
            : {}),
        },
      });

      const places = extractGroundedPlaces(response);
      res.json({
        text: response.text || '',
        places,
      });
    } catch (err: any) {
      const friendly = extractGeminiError(err, 'Erro ao consultar o Google Maps Grounding.');
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  // Transactional Email Notification Dispatch Endpoint
  app.post('/api/notifications/send', async (req: Request, res: Response) => {
    const { to, recipientName, subject, title, message, eventType } = req.body || {};

    if (typeof to !== 'string' || !isValidEmail(to)) {
      res.status(400).json({ error: 'Endereço de e-mail do destinatário inválido.' });
      return;
    }
    if (typeof subject !== 'string' || !subject.trim() || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Assunto e mensagem são obrigatórios.' });
      return;
    }

    const cleanTo = to.trim();
    const cleanName = escapeHtml(String(recipientName || 'Utilizador Ki-Imóveis'));
    const cleanTitle = escapeHtml(String(title || subject));
    const cleanMessage = escapeHtml(message.trim()).replace(/\n/g, '<br />');
    const fromAddress = process.env.EMAIL_FROM || 'Ki-Imóveis <notificacoes@kiimoveis.ao>';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; color: #111827;">
        <div style="margin-bottom: 16px; font-weight: 700; font-size: 18px; color: #FF385C;">Ki-Imóveis Angola</div>
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #111827;">${cleanTitle}</h2>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">Olá, ${cleanName},</p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #374151;">${cleanMessage}</p>
        <div style="padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">
          Evento: ${escapeHtml(String(eventType || 'notification'))} · Notificação automática da plataforma Ki-Imóveis.
        </div>
      </div>
    `;

    const textBody = `Olá ${String(recipientName || 'Utilizador')},\n\n${String(title || subject)}\n\n${message.trim()}\n\n--\nKi-Imóveis Angola`;

    // Option 1: SMTP via Nodemailer when configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT || 587) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const info = await transporter.sendMail({
          from: fromAddress,
          to: cleanTo,
          subject: subject.trim(),
          text: textBody,
          html: htmlBody,
        });

        res.json({
          ok: true,
          delivered: true,
          provider: 'smtp',
          messageId: info.messageId,
          recipient: cleanTo,
          sentAt: Date.now(),
        });
        return;
      } catch (err: any) {
        res.status(502).json({
          ok: false,
          delivered: false,
          error: err?.message || 'Falha no envio via SMTP.',
        });
        return;
      }
    }

    // Option 2: Resend REST API when configured
    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanTo],
            subject: subject.trim(),
            html: htmlBody,
            text: textBody,
          }),
        });

        const data = await resendRes.json();
        if (!resendRes.ok) {
          res.status(502).json({
            ok: false,
            delivered: false,
            error: data?.message || 'Falha no envio via Resend.',
          });
          return;
        }

        res.json({
          ok: true,
          delivered: true,
          provider: 'resend',
          messageId: data?.id || 'resend-' + Date.now(),
          recipient: cleanTo,
          sentAt: Date.now(),
        });
        return;
      } catch (err: any) {
        res.status(502).json({
          ok: false,
          delivered: false,
          error: err?.message || 'Erro de rede ao contactar Resend.',
        });
        return;
      }
    }

    // Option 3: No external mail credentials configured — record honest platform inbox receipt
    res.json({
      ok: true,
      delivered: false,
      queued: true,
      provider: 'platform_inbox',
      messageId: 'inbox-' + Date.now(),
      recipient: cleanTo,
      sentAt: Date.now(),
      note: 'Alerta registado na sua caixa de entrada Ki-Imóveis (configure SMTP_HOST ou RESEND_API_KEY para entrega externa).',
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ki-Imóveis server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
