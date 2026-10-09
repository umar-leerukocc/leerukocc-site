// netlify/functions/ipn-callback.js
//
// Appelée par Bictorys (serveur à serveur) après qu'un client a payé.
// Contrairement à PayDunya, Bictorys ne propose pas de "confirmer le
// paiement par token" : la notification webhook EST la confirmation. On la
// sécurise en vérifiant le header X-Secret-Key, qui doit correspondre à la
// clé secrète de webhook configurée sur le tableau de bord Bictorys.
//
// ⚠️ Côté Bictorys (tableau de bord → Développeurs → Webhooks), il faut
// renseigner manuellement cette URL : https://leerukocc.com/.netlify/functions/ipn-callback

const AIRTABLE_BASE_ID = 'appG0iNSflu90A1dw';
const AIRTABLE_TABLE_ID = 'tblZoVQ5YjbRFkAg5'; // "Tous les codes"

const STATUT_DISPONIBLE = 'Non utilisé';
const STATUT_VENDU = 'Vendu';

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
    if (!res.ok) console.error('Erreur envoi email Resend:', await res.text());
  } catch (err) {
    console.error('Erreur envoi email Resend:', err);
  }
}

const PRODUCTS = {
  app_only: { label: 'Wolof Express — Accès application', amount: 5900 },
  book_app: { label: 'Wolof Express — Livre + Application', amount: 9900 },
};

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
          Almadies II, Sortie 9 péage, Dakar, Sénégal
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
        Paiement réglé en ligne via Bictorys. Code d'activation associé : ${code}.
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
    if (!res.ok) console.error('Erreur envoi facture Resend:', await res.text());
  } catch (err) {
    console.error('Erreur envoi facture Resend:', err);
  }
}

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

async function sendInternalPurchaseNotice(buyerEmail, code) {
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
        to: 'umar@leerukocc.com',
        subject: `Nouvel achat Wolof Express — ${code}`,
        html: `
          <div style="font-family:sans-serif; color:#3A2A18;">
            <p><strong>Nouvel achat confirmé.</strong></p>
            <p>E-mail acheteur : ${buyerEmail}<br>
            Code envoyé : ${code}</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('Erreur envoi accusé de réception interne:', err);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Vérifier la clé secrète de webhook (jamais confiance à une requête
  //    non authentifiée — n'importe qui pourrait sinon POST sur cette URL
  //    et se faire attribuer un code gratuitement).
  const secretHeader = event.headers['x-secret-key'] || event.headers['X-Secret-Key'];
  if (!process.env.BICTORYS_WEBHOOK_SECRET || secretHeader !== process.env.BICTORYS_WEBHOOK_SECRET) {
    console.error('Webhook Bictorys reçu avec une clé secrète invalide ou absente.');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    console.error('Webhook Bictorys : JSON invalide', event.body);
    return { statusCode: 400, body: 'JSON invalide' };
  }

  const status = (body.status || '').toLowerCase();
  if (status !== 'succeeded' && status !== 'authorized') {
    console.log('Webhook Bictorys : statut non concluant, ignoré ->', status);
    return { statusCode: 200, body: 'OK - statut non concluant, ignoré' };
  }

  const buyerEmail = body.customerObject && body.customerObject.email;
  if (!buyerEmail) {
    console.error('Webhook Bictorys : paiement confirmé mais aucun email trouvé', body);
    return { statusCode: 200, body: 'OK - email manquant' };
  }

  // Le produit est encodé en préfixe de la référence par create-invoice.js
  // (ex: "app_only_1234567890_ab12cd").
  const reference = body.paymentReference || body.merchantReference || '';
  const productKey = reference.startsWith('book_app') ? 'book_app' : 'app_only';

  try {
    // 2. Protection anti double-attribution (ex: webhook livré deux fois)
    const existing = await findExistingAssignedCode(buyerEmail);
    if (existing) {
      console.log(`Code déjà attribué à ${buyerEmail} (${existing.fields.Code}), webhook ignoré.`);
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

    // 5. Email avec le code + accusé de réception interne + facture
    await sendActivationEmail(buyerEmail, activationCode);
    await sendInternalPurchaseNotice(buyerEmail, activationCode);
    await sendInvoiceEmail(buyerEmail, activationCode, productKey, body.amount);

    console.log(`Code ${activationCode} attribué à ${buyerEmail}`);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Erreur ipn-callback:', err);
    return { statusCode: 500, body: 'Erreur serveur' };
  }
};
