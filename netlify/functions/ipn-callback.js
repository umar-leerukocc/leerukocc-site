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

const STATUT_DISPONIBLE = 'Non utilisé';
// Statut intermédiaire : le code a été payé et attribué à un acheteur, mais
// pas encore activé sur un appareil. Distinct de "Utilisé" (réservé à
// l'activation réelle via verify-code.js), pour ne pas bloquer le vrai
// destinataire d'un code acheté en cadeau.
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
      typecast: true,
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

// Catalogue des produits (doit rester cohérent avec create-invoice.js)
const PRODUCTS = {
  app_only: { label: 'Wolof Express — Accès application', amount: 5900 },
  book_app: { label: 'Wolof Express — Livre + Application', amount: 9900 },
};

// Envoie une facture Leeru Kocc en bonne et due forme (distincte du reçu
// générique envoyé par PayDunya). Numéro de facture dérivé du code
// d'activation (unique), pas une numérotation séquentielle stricte au sens
// comptable — à faire valider par un comptable si nécessaire.
async function sendInvoiceEmail(toEmail, code, productKey, amount) {
  if (!process.env.RESEND_API_KEY) return;

  const product = PRODUCTS[productKey] || { label: 'Wolof Express', amount: amount || '' };
  const invoiceNumber = `LK-${code}`;
  const invoiceDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  const total = amount || product.amount;

  const html = `
    <div style="font-family:sans-serif; max-width:560px; margin:0 auto; color:#3A2A18;">
      <div style="border-bottom:2px solid #A0895D; padding-bottom:16px; margin-bottom:24px;">
        <img src="https://leerukocc.com/assets/img/logo-leeru-kocc.png" alt="Leeru Kocc" style="height:48px; margin-bottom:8px;">
        <h1 style="color:#5C411D; font-size:1.4em; margin:0;">Leeru Kocc</h1>
        <p style="font-size:0.8em; color:#777; margin:4px 0 0;">
          Entreprise individuelle — RCCM SN.DAKAR.2022.A.781 — NINEA 009107964<br>
          26, Route de la Corniche Ouest, Ouakam, Dakar, Sénégal
        </p>
      </div>

      <h2 style="color:#5C411D; font-size:1.2em;">Facture n° ${invoiceNumber}</h2>
      <p style="font-size:0.9em; color:#555;">Date d'émission : ${invoiceDate}<br>Client : ${toEmail}</p>

      <table style="width:100%; border-collapse:collapse; margin-top:20px;">
        <thead>
          <tr style="background:#f5f0e8; text-align:left;">
            <th style="padding:10px; font-size:0.85em; color:#5C411D;">Désignation</th>
            <th style="padding:10px; font-size:0.85em; color:#5C411D; text-align:center;">Qté</th>
            <th style="padding:10px; font-size:0.85em; color:#5C411D; text-align:right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px; border-bottom:1px solid #eee; font-size:0.9em;">${product.label}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; font-size:0.9em; text-align:center;">1</td>
            <td style="padding:10px; border-bottom:1px solid #eee; font-size:0.9em; text-align:right;">${total} FCFA</td>
          </tr>
        </tbody>
      </table>

      <p style="text-align:right; font-weight:bold; font-size:1.1em; color:#5C411D; margin-top:12px;">
        Total : ${total} FCFA
      </p>

      <p style="font-size:0.85em; color:#777; margin-top:8px;">
        Paiement réglé en ligne via PayDunya. Code d'activation associé : ${code}.
      </p>

      <p style="font-size:0.8em; color:#999; margin-top:32px; border-top:1px solid #eee; padding-top:16px;">
        Une question sur cette facture ? Écrivez-nous à
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
        from: 'Leeru Kocc <contact@leerukocc.com>',
        to: toEmail,
        subject: `Facture Leeru Kocc n° ${invoiceNumber}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Erreur envoi facture Resend:', await res.text());
    }
  } catch (err) {
    console.error('Erreur envoi facture Resend:', err);
  }
}

// Alerte Leeru Kocc quand le stock de codes disponibles est épuisé.
async function sendStockAlert() {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wolof Express <contact@leerukocc.com>',
        to: 'leerukocc@gmail.com',
        subject: '⚠️ Stock de codes Wolof Express épuisé',
        html: '<p>Un client a payé, mais il ne reste plus aucun code "Non utilisé" dans Airtable. Merci de générer un nouveau lot de codes au plus vite.</p>',
      }),
    });
  } catch (err) {
    console.error('Erreur envoi alerte stock:', err);
  }
}

// Extrait le token PayDunya du corps de la requête IPN, quel que soit le format.
// PayDunya envoie en réalité du form-urlencoded avec des clés en notation
// à crochets, ex: data[response_code]=00&data[token]=xxxx&... (constaté en
// production le 05/09/2026). On gère aussi, par sécurité, un champ "data"
// unique contenant du JSON, un champ "token" direct, et du JSON brut.
function extractToken(event) {
  const contentType = event.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    const body = JSON.parse(event.body);
    return body.token || (body.data && JSON.parse(body.data).token);
  }

  // form-urlencoded
  const params = new URLSearchParams(event.body);

  // Format constaté en production : data[token]=xxxx (notation à crochets)
  if (params.get('data[token]')) return params.get('data[token]');

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
      await sendStockAlert();
      return { statusCode: 200, body: 'OK - stock de codes épuisé' };
    }

    // 4. Marquer le code comme vendu et l'associer à l'acheteur
    await assignCode(codeRecord.id, buyerEmail);
    const activationCode = codeRecord.fields.Code;

    // 5. Envoyer l'email avec le code (silencieux si RESEND_API_KEY absent)
    await sendActivationEmail(buyerEmail, activationCode);

    // 6. Envoyer la facture Leeru Kocc (distincte du reçu PayDunya)
    const productKey = customData.product;
    const paidAmount = confirmation.total_amount || confirmation.amount;
    await sendInvoiceEmail(buyerEmail, activationCode, productKey, paidAmount);

    console.log(`Code ${activationCode} attribué à ${buyerEmail}`);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Erreur ipn-callback:', err);
    return { statusCode: 500, body: 'Erreur serveur' };
  }
};
