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

// Catalogue des produits (doit rester cohérent avec create-invoice.js)
const PRODUCTS = {
  app_only: { label: 'Wolof Express — Accès application', amount: 5900 },
  book_app: { label: 'Wolof Express — Livre + Application', amount: 9900 },
};

// Envoie une facture Leeru Kocc en bonne et due forme (distincte du reçu
// générique envoyé par PayDunya). Le numéro de facture est dérivé du code
// d'activation, qui est déjà unique — pas une numérotation séquentielle
// stricte au sens comptable. À faire valider par un comptable si Leeru Kocc
// est soumis à des obligations fiscales de numérotation continue.
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

// Envoie l'email contenant le code d'activation via Resend.
// Ne fait rien (silencieusement) si RESEND_API_KEY n'est pas encore configuré.
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

// Alerte Leeru Kocc quand le stock de codes disponibles est épuisé.
// Silencieuse si RESEND_API_KEY n'est pas configuré.
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
        html: '<p>Un client a tenté un achat, mais il ne reste plus aucun code "Non utilisé" dans Airtable. Merci de générer un nouveau lot de codes.</p>',
      }),
    });
  } catch (err) {
    console.error('Erreur envoi alerte stock:', err);
  }
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
      await sendStockAlert();
      return { statusCode: 200, body: JSON.stringify({ status: 'completed', assigned: false, error: 'Plus de codes disponibles' }) };
    }

    await assignCode(available.id, email);
    await sendActivationEmail(email, available.fields.Code);

    const productKey = confirmation.custom_data && confirmation.custom_data.product;
    const paidAmount = confirmation.total_amount || confirmation.amount;
    await sendInvoiceEmail(email, available.fields.Code, productKey, paidAmount);

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
