// netlify/functions/confirm-payment.js
//
// Filet de sécurité : appelée directement par le NAVIGATEUR du client quand
// il atterrit sur wolof-express.html?paiement=confirme&token=XXX après paiement.
// Ne dépend PAS de l'IPN PayDunya (qui peut être lent ou ne jamais arriver
// en mode sandbox). Reconfirme le paiement auprès de PayDunya avec le token,
// puis attribue un code Wolof Express — sauf si un code a déjà été attribué
// à cet acheteur pour ce paiement (protection contre le double-clic / rechargement
// de page, qui redéclencherait sinon un deuxième appel).
//
// Attend une requête GET avec ?token=XXXX en paramètre.

const AIRTABLE_BASE_ID = 'appG0iNSflu90A1dw';
const AIRTABLE_TABLE_ID = 'tblZoVQ5YjbRFkAg5'; // "Tous les codes"

const STATUT_DISPONIBLE = 'Non utilisé';
const STATUT_VENDU = 'Utilisé';

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

// Vérifie si un code a déjà été attribué à cet email (évite le double envoi
// si le client recharge la page de confirmation).
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

exports.handler = async (event) => {
  const token = event.queryStringParameters && event.queryStringParameters.token;

  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Token manquant' }) };
  }

  try {
    const confirmation = await confirmPayment(token);

    if (confirmation.response_code !== '00' || confirmation.status !== 'completed') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: confirmation.status || 'unknown', assigned: false }),
      };
    }

    const email =
      confirmation.custom_data && confirmation.custom_data.buyer_email
        ? confirmation.custom_data.buyer_email
        : null;

    if (!email) {
      return { statusCode: 200, body: JSON.stringify({ status: 'completed', assigned: false, error: 'Email introuvable dans custom_data' }) };
    }

    // Protection anti double-attribution
    const existing = await findExistingAssignedCode(email);
    if (existing) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', assigned: true, code: existing.fields.Code, alreadyAssigned: true }),
      };
    }

    const available = await getAvailableCode();
    if (!available) {
      return { statusCode: 200, body: JSON.stringify({ status: 'completed', assigned: false, error: 'Plus de codes disponibles' }) };
    }

    await assignCode(available.id, email);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', assigned: true, code: available.fields.Code }),
    };
  } catch (err) {
    console.error('Erreur confirm-payment:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
