// netlify/functions/ipn-callback.js
//
// Appelée par PayDunya (serveur à serveur) après qu'un client a payé.
// On NE FAIT JAMAIS confiance à l'IPN seule : on reconfirme le paiement
// directement auprès de PayDunya avec le token reçu, puis on attribue
// un code Wolof Express disponible dans Airtable.
//
// TODO (prochaine étape) : brancher l'envoi d'email automatique (ex. Resend)
// à l'endroit indiqué plus bas, une fois RESEND_API_KEY configuré.

const AIRTABLE_BASE_ID = 'appG0iNSflu90A1dw';
const AIRTABLE_TABLE_ID = 'tblZoVQ5YjbRFkAg5'; // "Tous les codes"

// ⚠️ À confirmer avec Oumar : les valeurs exactes du menu déroulant "Statut"
// dans Airtable. Ajuste ces deux constantes si les libellés diffèrent.
const STATUT_DISPONIBLE = 'Disponible';
const STATUT_VENDU = 'Vendu';

function paydunyaApiBase() {
  return process.env.PAYDUNYA_MODE === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';
}

async function confirmPayment(token) {
  const response = await fetch(`${paydunyaApiBase()}/checkout-invoice/confirm/${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
      'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
      'PAYDUNYA-PUBLIC-KEY': process.env.PAYDUNYA_PUBLIC_KEY,
      'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
    },
  });
  return response.json();
}

async function getAvailableCode() {
  const formula = encodeURIComponent(`{Statut} = "${STATUT_DISPONIBLE}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  const data = await response.json();
  return data.records && data.records[0] ? data.records[0] : null;
}

async function assignCode(recordId, email) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        Statut: STATUT_VENDU,
        'Email acheteur': email,
        "Date d'activation": new Date().toISOString().split('T')[0],
      },
    }),
  });
  return response.json();
}

// Extrait le token PayDunya du corps de la requête IPN, quel que soit le format
// (PayDunya envoie généralement du form-urlencoded avec un champ "data" en JSON,
// mais on gère aussi le JSON brut par sécurité).
function extractToken(event) {
  const contentType = event.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    const body = JSON.parse(event.body);
    return body.token || (body.data && JSON.parse(body.data).token);
  }

  // form-urlencoded
  const params = new URLSearchParams(event.body);
  if (params.get('token')) return params.get('token');
  if (params.get('data')) {
    try {
      const parsed = JSON.parse(params.get('data'));
      return parsed.token;
    } catch (e) {
      return null;
    }
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = extractToken(event);
  if (!token) {
    console.error('IPN reçu sans token exploitable:', event.body);
    return { statusCode: 400, body: 'Token manquant' };
  }

  try {
    // 1. Reconfirmer le paiement directement auprès de PayDunya (jamais confiance à l'IPN seule)
    const confirmation = await confirmPayment(token);

    const status = confirmation.status || (confirmation.invoice && confirmation.invoice.status);

    if (confirmation.response_code !== '00' || status !== 'completed') {
      console.log('Paiement non complété, statut:', status);
      return { statusCode: 200, body: 'OK - paiement non complété, ignoré' };
    }

    const customData = confirmation.custom_data || (confirmation.invoice && confirmation.invoice.custom_data) || {};
    const buyerEmail = customData.buyer_email;

    if (!buyerEmail) {
      console.error('Paiement confirmé mais aucun email trouvé dans custom_data', confirmation);
      return { statusCode: 200, body: 'OK - email manquant' };
    }

    // 2. Récupérer un code disponible dans Airtable
    const codeRecord = await getAvailableCode();
    if (!codeRecord) {
      console.error('Plus aucun code disponible dans Airtable !');
      // TODO : s'envoyer une alerte email/notification à ce stade — stock de codes épuisé
      return { statusCode: 200, body: 'OK - stock de codes épuisé' };
    }

    // 3. Marquer le code comme vendu et l'associer à l'acheteur
    await assignCode(codeRecord.id, buyerEmail);

    const activationCode = codeRecord.fields.Code;

    // 4. TODO : envoyer l'email avec le code à buyerEmail (via Resend une fois configuré)
    // Exemple prêt à l'emploi une fois RESEND_API_KEY disponible :
    //
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'Leeru Kocc <noreply@leerukocc.com>',
    //     to: buyerEmail,
    //     subject: 'Ton code Wolof Express',
    //     html: `<p>Merci pour ton achat ! Ton code d'activation : <strong>${activationCode}</strong></p>`,
    //   }),
    // });

    console.log(`Code ${activationCode} attribué à ${buyerEmail}`);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Erreur ipn-callback:', err);
    return { statusCode: 500, body: 'Erreur serveur' };
  }
};
