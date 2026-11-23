const DEFAULT_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

export const toWhatsAppUrl = (phone, message) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
};

export const WHATSAPP_HREF = toWhatsAppUrl(DEFAULT_WHATSAPP) || '/contact';

export { DEFAULT_WHATSAPP };
