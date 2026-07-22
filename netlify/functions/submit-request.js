// ===========================================================
// submit-request.js
// Reçoit les demandes du formulaire "Cours de Wolof" et
// "Consultance & Traduction", et les enregistre dans Airtable.
//
// Variables d'environnement requises (Netlify) :
//   AIRTABLE_API_KEY    → même jeton que pour verify-code (ou dédié)
//   AIRTABLE_BASE_ID     → base Airtable (peut être la même base,
//                          avec une table séparée "Demandes")
//   AIRTABLE_REQUESTS_TABLE → nom de la table, ex: "Demandes"
// ===========================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Méthode non autorisée.' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Requête invalide.' }) };
  }

  const { type, nom, email } = data;
  if (!type || !nom || !email) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Champs requis manquants.' }) };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_REQUESTS_TABLE } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_REQUESTS_TABLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Configuration serveur incomplète. Contactez l'administrateur." })
    };
  }

  const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_REQUESTS_TABLE)}`;

  const labels = {
    formule: {
      'individuel-presentiel': 'Individuel, présentiel',
      'individuel-ligne': 'Individuel, en ligne',
      'groupe-presentiel': 'Groupe, présentiel',
      'groupe-ligne': 'Groupe, en ligne',
      'pas-sur': 'Pas encore décidé'
    },
    niveau: {
      'debutant': 'Débutant complet',
      'quelques-notions': 'Quelques notions',
      'intermediaire': 'Intermédiaire',
      'avance': 'Avancé, perfectionnement'
    },
    service: {
      'consultance': 'Consultance linguistique',
      'traduction': 'Traduction',
      'communication': 'Communication',
      'ingenierie': 'Ingénierie pédagogique',
      'autre': 'Autre / à discuter'
    }
  };

  const lignes = [];
  if (data.formule) lignes.push(`Formule : ${labels.formule[data.formule] || data.formule}`);
  if (data.niveau) lignes.push(`Niveau : ${labels.niveau[data.niveau] || data.niveau}`);
  if (data.disponibilites) lignes.push(`Disponibilités : ${data.disponibilites}`);
  if (data.service) lignes.push(`Service : ${labels.service[data.service] || data.service}`);
  if (data.description) lignes.push(`Description : ${data.description}`);

  const fields = {
    'Type': type === 'cours' ? 'Cours de Wolof' : 'Consultance / Traduction',
    'Nom': nom,
    'Email': email,
    'Téléphone': data.telephone || '',
    'Détails': lignes.length ? lignes.join('\n') : 'Aucun détail supplémentaire.',
    'Statut': 'Nouvelle',
    'Date': new Date().toISOString().slice(0, 10)
  };

  try {
    const res = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ typecast: true, fields })
    });

    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: "Erreur lors de l'enregistrement. Réessayez." }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Erreur serveur. Réessayez dans un instant.' }) };
  }
};
