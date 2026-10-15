// netlify/functions/ipn-callback.js
//
// Appelée par Bictorys (serveur à serveur) après un paiement. La notification
// webhook EST la confirmation : on la sécurise avec le header X-Secret-Key.
// URL à renseigner sur Bictorys : https://leerukocc.com/.netlify/functions/ipn-callback
//
// Produits (encodés en préfixe de la référence par create-invoice.js) :
//   app_only_...  -> 1 code
//   duo_...       -> 2 codes (Pack Duo)
//
// Anti-doublon : basé sur la référence du paiement (champ "Référence paiement"),
// et non plus sur l'e-mail, pour qu'un même client puisse racheter (pour offrir).

const AIRTABLE_BASE_ID = 'appG0iNSflu90A1dw';
const AIRTABLE_TABLE_ID = 'tblZoVQ5YjbRFkAg5'; // "Tous les codes"
const STATUT_DISPONIBLE = 'Non utilisé';
const STATUT_VENDU = 'Vendu';

const PRODUCTS = {
  app_only: { label: 'Wolof Express, accès application', amount: 5900, codes: 1 },
  duo: { label: 'Wolof Express, Pack Duo (2 accès application)', amount: 9900, codes: 2 },
};

const AT_HEADERS = () => ({
  Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
});
const atUrl = (q = '') => `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}${q}`;
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

async function findByReference(reference) {
  const formula = encodeURIComponent(`{Référence paiement} = "${esc(reference)}"`);
  const res = await fetch(atUrl(`?filterByFormula=${formula}`), { headers: AT_HEADERS() });
  const data = await res.json();
  return data.records || [];
}

async function getAvailableCodes(n) {
  const formula = encodeURIComponent(`{Statut} = "${STATUT_DISPONIBLE}"`);
  const res = await fetch(atUrl(`?filterByFormula=${formula}&maxRecords=${n}`), { headers: AT_HEADERS() });
  const data = await res.json();
  return data.records || [];
}

async function assignCodes(records, email, reference) {
  const res = await fetch(atUrl(), {
    method: 'PATCH',
    headers: AT_HEADERS(),
    body: JSON.stringify({
      typecast: true,
      records: records.map((r) => ({
        id: r.id,
        fields: {
          Statut: STATUT_VENDU,
          'Email acheteur': email,
          "Date d'activation": new Date().toISOString().split('T')[0],
          'Référence paiement': reference,
        },
      })),
    }),
  });
  return res.json();
}

async function sendEmail({ from, to, subject, html }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.error('Erreur Resend:', await res.text());
  } catch (err) {
    console.error('Erreur Resend:', err);
  }
}

const codeBox = (c) => `<p style="font-size:1.3em; font-weight:bold; letter-spacing:1px; background:#f5f0e8; padding:14px 18px; border-radius:8px; color:#A0895D; display:inline-block; margin:6px 0;">${c}</p>`;

function activationEmailHtml(codes) {
  const duo = codes.length > 1;
  return `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#3A2A18;">
      <h2 style="color:#5C411D;">Merci pour votre achat !</h2>
      <p>${duo ? 'Voici vos deux codes d\'activation Wolof Express :' : 'Voici votre code d\'activation Wolof Express :'}</p>
      ${codes.map(codeBox).join('<br>')}
      ${duo ? '<p>Un code pour vous, un code à offrir : chaque code s\'active une seule fois, avec l\'e-mail de la personne qui l\'utilise.</p>' : ''}
      <p>Pour activer l'appli, rendez-vous sur
        <a href="https://leerukocc.com/wolof-express.html#activer" style="color:#A0895D;">leerukocc.com/wolof-express.html</a>
        et entrez le code avec votre e-mail.</p>
      <p style="font-size:0.9em; color:#777; margin-top:2rem;">
        Une question ? Écrivez-nous à <a href="mailto:contact@leerukocc.com" style="color:#A0895D;">contact@leerukocc.com</a>.
      </p>
    </div>`;
}

function invoiceHtml(toEmail, codes, productKey, amount) {
  const product = PRODUCTS[productKey];
  const invoiceNumber = `LK-${codes[0]}`;
  const invoiceDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  const total = amount || product.amount;
  return {
    invoiceNumber,
    html: `
    <div style="font-family:sans-serif; max-width:560px; margin:0 auto; color:#3A2A18;">
      <div style="border-bottom:2px solid #A0895D; padding-bottom:16px; margin-bottom:24px;">
        <img src="https://leerukocc.com/assets/img/logo-leeru-kocc.png" alt="Leeru Kocc" style="height:48px; margin-bottom:8px;">
        <h1 style="color:#5C411D; font-size:1.4em; margin:0;">Leeru Kocc</h1>
        <p style="font-size:0.8em; color:#777; margin:4px 0 0;">
          Entreprise individuelle · RCCM SN.DAKAR.2022.A.781 · NINEA 009107964<br>
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
      <p style="text-align:right; font-weight:bold; font-size:1.1em; color:#5C411D; margin-top:12px;">Total : ${total} FCFA</p>
      <p style="font-size:0.85em; color:#777; margin-top:8px;">
        Paiement réglé en ligne via Bictorys. ${codes.length > 1 ? 'Codes d\'activation associés' : 'Code d\'activation associé'} : ${codes.join(', ')}.
      </p>
      <p style="font-size:0.8em; color:#999; margin-top:32px; border-top:1px solid #eee; padding-top:16px;">
        Une question sur cette facture ? Écrivez-nous à <a href="mailto:contact@leerukocc.com" style="color:#A0895D;">contact@leerukocc.com</a>.
      </p>
    </div>`,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const secretHeader = event.headers['x-secret-key'] || event.headers['X-Secret-Key'];
  if (!process.env.BICTORYS_WEBHOOK_SECRET || secretHeader !== process.env.BICTORYS_WEBHOOK_SECRET) {
    console.error('Webhook Bictorys : clé secrète invalide ou absente.');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'JSON invalide' }; }

  const status = (body.status || '').toLowerCase();
  if (status !== 'succeeded' && status !== 'authorized') {
    return { statusCode: 200, body: 'OK - statut non concluant, ignoré' };
  }

  const buyerEmail = body.customerObject && body.customerObject.email;
  const reference = body.paymentReference || body.merchantReference || '';
  if (!buyerEmail || !reference) {
    console.error('Webhook Bictorys : e-mail ou référence manquant', body);
    return { statusCode: 200, body: 'OK - données manquantes' };
  }

  const productKey = reference.startsWith('duo_') ? 'duo' : 'app_only';
  const nbCodes = PRODUCTS[productKey].codes;

  try {
    // Anti-doublon : ce paiement a-t-il déjà donné lieu à une attribution ?
    const already = await findByReference(reference);
    if (already.length) return { statusCode: 200, body: 'OK - déjà attribué' };

    const available = await getAvailableCodes(nbCodes);
    if (available.length < nbCodes) {
      console.error('Stock de codes insuffisant !');
      await sendEmail({
        from: 'Wolof Express <contact@leerukocc.com>',
        to: 'contact@leerukocc.com',
        subject: '⚠️ Stock de codes Wolof Express épuisé',
        html: `<p>Un client (${buyerEmail}) a payé (référence ${reference}), mais le stock de codes "Non utilisé" est insuffisant. Merci de générer un nouveau lot et de lui envoyer ses codes manuellement.</p>`,
      });
      return { statusCode: 200, body: 'OK - stock insuffisant' };
    }

    await assignCodes(available, buyerEmail, reference);
    const codes = available.map((r) => r.fields.Code);

    await sendEmail({
      from: 'Wolof Express <contact@leerukocc.com>',
      to: buyerEmail,
      subject: codes.length > 1 ? 'Vos codes d\'activation Wolof Express (Pack Duo)' : 'Votre code d\'activation Wolof Express',
      html: activationEmailHtml(codes),
    });
    await sendEmail({
      from: 'Wolof Express <contact@leerukocc.com>',
      to: 'contact@leerukocc.com',
      subject: `Nouvel achat Wolof Express (${productKey === 'duo' ? 'Pack Duo' : 'Appli seule'}) : ${codes.join(', ')}`,
      html: `<div style="font-family:sans-serif; color:#3A2A18;"><p><strong>Nouvel achat confirmé.</strong></p><p>E-mail acheteur : ${buyerEmail}<br>Produit : ${PRODUCTS[productKey].label}<br>Code(s) envoyé(s) : ${codes.join(', ')}<br>Référence : ${reference}</p></div>`,
    });
    const inv = invoiceHtml(buyerEmail, codes, productKey, body.amount);
    await sendEmail({
      from: 'Leeru Kocc <contact@leerukocc.com>',
      to: buyerEmail,
      subject: `Facture Leeru Kocc n° ${inv.invoiceNumber}`,
      html: inv.html,
    });

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Erreur ipn-callback:', err);
    return { statusCode: 500, body: 'Erreur serveur' };
  }
};
