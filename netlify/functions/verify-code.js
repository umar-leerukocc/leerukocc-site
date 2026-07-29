// ===========================================================
// verify-code.js
// Vérifie un code d'activation Wolof Express contre Airtable.
// Marque le code comme "Utilisé" pour empêcher toute réutilisation.
//
// Variables d'environnement requises (à définir dans Netlify,
// PAS dans ce fichier — voir README.md) :
//   AIRTABLE_API_KEY   → clé API / Personal Access Token Airtable
//   AIRTABLE_BASE_ID   → identifiant de la base Airtable
//   AIRTABLE_TABLE     → nom de la table (ex: "Tous les codes")
//   APP_DOWNLOAD_URL   → lien vers wolof-express-audio.html une fois hébergé
// ===========================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Méthode non autorisée.' }) };
  }

  let code, email;
  try {
    const body = JSON.parse(event.body);
    code = (body.code || '').trim().toUpperCase();
    email = (body.email || '').trim();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Requête invalide.' }) };
  }

  if (!code || !email) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Code et e-mail requis.' }) };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE, APP_DOWNLOAD_URL } = process.env;

  // Code passe-partout : donne accès sans consommer ni vérifier un code Airtable.
  // Utile pour les démonstrations, les tests, ou l'équipe Leeru Kocc.
  // Ne jamais communiquer ce code publiquement.
  const MASTER_CODE = 'LEERUKOCC-MASTER';
  if (code === MASTER_CODE) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        appUrl: APP_DOWNLOAD_URL || '/app/wolof-express-audio.html'
      })
    };
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Configuration serveur incomplète. Contactez l'administrateur." })
    };
  }

  const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

  try {
    // 1. Chercher le code dans Airtable
    const filterFormula = encodeURIComponent(`{Code} = "${code}"`);
    const searchRes = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const searchData = await searchRes.json();

    if (!searchData.records || searchData.records.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ success: false, message: "Code introuvable. Vérifiez la saisie." }) };
    }

    const record = searchData.records[0];
    const statut = record.fields['Statut'];

    if (statut === 'Utilisé') {
      return { statusCode: 200, body: JSON.stringify({ success: false, message: 'Ce code a déjà été utilisé.' }) };
    }

    // 2. Marquer le code comme utilisé
    const updateRes = await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        typecast: true,
        fields: {
          Statut: 'Utilisé',
          'Email acheteur': email,
          "Date d'activation": new Date().toISOString().slice(0, 10)
        }
      })
    });

    if (!updateRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Erreur lors de la validation. Réessayez.' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        appUrl: APP_DOWNLOAD_URL || '/app/wolof-express-audio.html'
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Erreur serveur. Réessayez dans un instant.' }) };
  }
};
