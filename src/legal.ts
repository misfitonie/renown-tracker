// Page « Mentions légales & confidentialité » (servie par le SPA, voir vercel.json)
export const LEGAL_PATH = '/legal';

export const LEGAL = {
  publisher: '[Nom et prénom de l’éditeur]',
  contactEmail: '[adresse email de contact]',
  updatedAt: '2026-10-28',
};

export const LEGAL_SECTIONS = [
  'publisher',
  'hosting',
  'data',
  'purposes',
  'recipients',
  'retention',
  'storage',
  'rights',
] as const;
