// netlify/functions/confirm-payment.js
//
// Filet de sécurité : appelée par le NAVIGATEUR du client quand il atterrit
// sur wolof-express.html?paiement=confirme après paiement. Contrairement à la
// version PayDunya, Bictorys ne propose pas de "confirmer un paiement par
// token" — la seule confirmation fiable est le webhook (ipn-callback.js), qui
// fait le travail d'attribution du code. Cette fonction se contente donc de
// VÉRIFIER dans Airtable si le webhook a déjà fait son travail pour cet
// e-mail, et répond en conséquence. Le front-end interroge ce endpoint
// plusieurs fois à quelques secondes d'intervalle (voir wolof-express.html)
// pour laisser au webhook le temps d'arriver.
//
// Attend une requête GET avec ?email=... en paramètre.

const AIRTABLE_BASE_ID = 'appG0iNSflu90A1dw';
const AIRTABLE_TABLE_ID = 'tblZoVQ5YjbRFkAg5'; // "Tous les codes"

const STATUT_VENDU = 'Vendu';

async function findExistingAssignedCode(email) {
  const formula = encodeURIComponent(
    `AND({Statut} = "${STATUT_VENDU}", {Email acheteur} = "${email}")`
  );
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  const data = await response.json();
  return data.records && data.records[0] ? data.records[0] : null;
}

exports.handler = async (event) => {
  const email = event.queryStringParameters && event.queryStringParameters.email;

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email manquant' }) };
  }

  try {
    const existing = await findExistingAssignedCode(email);
    if (existing) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned: true, code: existing.fields.Code }),
      };
    }
    // Pas encore attribué : le webhook Bictorys n'est peut-être pas encore
    // arrivé. Ce n'est pas une erreur — le front-end réessaiera.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned: false }),
    };
  } catch (err) {
    console.error('Erreur confirm-payment:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
