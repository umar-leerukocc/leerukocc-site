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

// Protection anti double-attribution : si un code a déjà été assigné à cet
// email (par exemple via confirm-payment.js, qui s'exécute côté client et
// est souvent plus rapide que l'IPN), on ne réattribue pas et on n'envoie
// pas de deuxième email.
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

// Envoie l'email contenant le code d'activation via Resend.
// Ne fait rien (silencieusement) si RESEND_API_KEY n'est pas encore configuré,
// pour ne jamais faire échouer l'attribution du code à cause de l'email.
async function sendActivationEmail(toEmail, code) {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY absent — email non envoyé (code déjà attribué en base).');
    return;
  }

  const html = `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#3A2A18;">
      <h2 style="color:#5C411D;">Merci pour votre achat !</h2>
      <p>Voici votre code d'activation Wolof Express :</p>
      <p style="font-size:1.3em; font-weight:bold; letter-spacing:1px;
        background:#f5f0e8; padding:14px 18px; border-radius:8px; color:#A0895D;
        display:inline-block;">${code}</p>
      <p>Pour activer votre appli, rendez-vous sur
        <a href="https://leerukocc.com/wolof-express.html#activer" style="color:#A0895D;">leerukocc.com/wolof-express.html</a>
        et entrez ce code avec votre e-mail.</p>
      <p style="font-size:0.9em; color:#777; margin-top:2rem;">
        Une question ? Écrivez-nous à
        <a href="mailto:leerukocc@gmail.com" style="color:#A0895D;">leerukocc@gmail.com</a>.
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wolof Express <contact@leerukocc.com>',
        to: toEmail,
        subject: 'Votre code d\'activation Wolof Express',
        html,
      }),
    });
    if (!res.ok) {
      console.error('Erreur envoi email Resend:', await res.text());
    }
  } catch (err) {
    console.error('Erreur envoi email Resend:', err);
  }
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

    // 2. Vérifier qu'un code n'a pas déjà été attribué à cet acheteur
    //    (cas fréquent : confirm-payment.js, côté client, est souvent plus
    //    rapide que cette notification IPN qui peut arriver avec un délai).
    const existing = await findExistingAssignedCode(buyerEmail);
    if (existing) {
      console.log(`Code déjà attribué à ${buyerEmail} (${existing.fields.Code}), IPN ignoré.`);
      return { statusCode: 200, body: 'OK - déjà attribué' };
    }

    // 3. Récupérer un code disponible dans Airtable
    const codeRecord = await getAvailableCode();
    if (!codeRecord) {
      console.error('Plus aucun code disponible dans Airtable !');
      // TODO : s'envoyer une alerte email/notification à ce stade — stock de codes épuisé
      return { statusCode: 200, body: 'OK - stock de codes épuisé' };
    }

    // 4. Marquer le code comme vendu et l'associer à l'acheteur
    await assignCode(codeRecord.id, buyerEmail);
    const activationCode = codeRecord.fields.Code;

    // 5. Envoyer l'email avec le code (silencieux si RESEND_API_KEY absent)
    await sendActivationEmail(buyerEmail, activationCode);

    console.log(`Code ${activationCode} attribué à ${buyerEmail}`);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Erreur ipn-callback:', err);
    return { statusCode: 500, body: 'Erreur serveur' };
  }
};
