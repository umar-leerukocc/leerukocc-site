// netlify/functions/confirm-payment.js
//
// Appelée par le navigateur au retour de paiement (wolof-express.html?paiement=confirme&ref=...).
// Bictorys n'a pas de "confirmation par token" : c'est le webhook (ipn-callback.js) qui
// attribue les codes. Cette fonction vérifie seulement si c'est déjà fait pour cette
// référence de paiement, et renvoie le ou les codes (2 pour un Pack Duo).
// Le navigateur réessaie plusieurs fois, le temps que le webhook arrive.
//
// GET ?ref=<référence du paiement>

const AIRTABLE_BASE_ID = 'appG0iNSflu90A1dw';
const AIRTABLE_TABLE_ID = 'tblZoVQ5YjbRFkAg5'; // "Tous les codes"

exports.handler = async (event) => {
  const ref = (event.queryStringParameters && event.queryStringParameters.ref) || '';
  // Format attendu : produit_horodatage_aléatoire (lettres, chiffres, tirets bas uniquement)
  if (!/^[a-z_]+_\d+_[a-z0-9]+$/.test(ref)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Référence invalide' }) };
  }
  try {
    const formula = encodeURIComponent(`{Référence paiement} = "${ref}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${formula}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } });
    const data = await res.json();
    const codes = (data.records || []).map((r) => r.fields.Code).filter(Boolean);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(codes.length ? { assigned: true, codes } : { assigned: false }),
    };
  } catch (err) {
    console.error('Erreur confirm-payment:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
