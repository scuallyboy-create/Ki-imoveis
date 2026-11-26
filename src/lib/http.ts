export interface SafeJsonResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  errorMessage?: string;
}

export async function safeParseJsonResponse<T = any>(
  res: Response,
  fallbackError = 'Resposta inválida do servidor.'
): Promise<SafeJsonResult<T>> {
  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    return {
      ok: false,
      status: res.status || 500,
      data: null,
      errorMessage: fallbackError,
    };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      errorMessage: res.ok ? undefined : fallbackError,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as T;
    const apiErr =
      parsed && typeof parsed === 'object' && 'error' in (parsed as any)
        ? String((parsed as any).error || '')
        : '';
    return {
      ok: res.ok,
      status: res.status,
      data: parsed,
      errorMessage: !res.ok ? apiErr || fallbackError : undefined,
    };
  } catch {
    const isHtmlOrGateway =
      trimmed.startsWith('<') ||
      trimmed.toLowerCase().startsWith('the page') ||
      trimmed.toLowerCase().includes('cannot post') ||
      trimmed.toLowerCase().includes('not found');

    return {
      ok: false,
      status: res.status || 502,
      data: null,
      errorMessage: isHtmlOrGateway
        ? 'O serviço do servidor não está acessível neste endereço no momento. Recarregue a página ou tente novamente em instantes.'
        : fallbackError,
    };
  }
}
