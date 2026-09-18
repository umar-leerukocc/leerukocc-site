// ===========================================================
// save-progress.js
// Sauvegarde la progression de l'utilisateur (thèmes maîtrisés, scores...)
// dans Airtable, sur l'enregistrement du code d'activation correspondant.
// Appelée en tâche de fond par l'appli, quand elle a du réseau — n'est
// jamais requise pour que l'appli fonctionne hors ligne : en cas d'échec
// (pas de réseau, etc.), l'appli continue de fonctionner normalement sur
// la seule base du localStorage local, et retente plus tard.
//
// Attend une requête POST avec : { code, email, progress }
// - code : le code d'activation (pour retrouver l'enregistrement Airtable)
// - email : sert de vérification — doit correspondre à l'e-mail déjà
//   enregistré pour ce code, sinon la sauvegarde est refusée
// - progress : la progression à sauvegarder, un objet JS quelconque
//   (sera stocké tel quel en JSON dans le champ Airtable "Progression")
// ===========================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false }) };
  }

  let code, email, progress;
  try {
    const body = JSON.parse(event.body);
    code = (body.code || '').trim().toUpperCase();
    email = (body.email || '').trim().toLowerCase();
    progress = body.progress;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Requête invalide.' }) };
  }

  if (!code || !email || progress === undefined) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Code, e-mail et progression requis.' }) };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE } = process.env;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Configuration serveur incomplète.' }) };
  }

  const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

  try {
    const filterFormula = encodeURIComponent(`{Code} = "${code}"`);
    const searchRes = await fetch(`${airtableUrl}?filterByFormula=${filterFormula}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const searchData = await searchRes.json();

    if (!searchData.records || searchData.records.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ success: false, message: 'Code introuvable.' }) };
    }

    const record = searchData.records[0];
    const registeredEmail = (record.fields['Email acheteur'] || '').trim().toLowerCase();

    // Sécurité : on ne sauvegarde que si l'e-mail correspond au titulaire
    // du code, pour éviter qu'un tiers n'écrase la progression de quelqu'un
    // d'autre en devinant un code.
    if (!registeredEmail || registeredEmail !== email) {
      return { statusCode: 200, body: JSON.stringify({ success: false, message: 'E-mail non reconnu pour ce code.' }) };
    }

    const updateRes = await fetch(`${airtableUrl}/${record.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        typecast: true,
        fields: {
          Progression: JSON.stringify(progress)
        }
      })
    });

    if (!updateRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Erreur lors de la sauvegarde.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Erreur serveur.' }) };
  }
};
