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
//   WOLOF_MASTER_CODE  → (optionnel) code passe-partout pour tests/démos,
//                        donne un accès complet sans consommer de code
//                        Airtable. Si cette variable n'est pas définie,
//                        aucun code passe-partout n'est actif.
//                        Ne JAMAIS écrire sa valeur dans ce fichier.
// ===========================================================

// Envoie une alerte discrète à l'acheteur à chaque réactivation d'un code
// déjà utilisé (même e-mail) — traçabilité en cas de partage abusif, sans
// jamais bloquer l'accès légitime. Silencieux si RESEND_API_KEY absent.
async function sendReactivationAlert(email, code) {
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
        to: email,
        subject: 'Nouvelle connexion à votre appli Wolof Express',
        html: `
          <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#3A2A18;">
            <p>Bonjour,</p>
            <p>Votre code d'activation Wolof Express (<strong>${code}</strong>) vient d'être utilisé pour accéder à l'appli sur un appareil ou un navigateur.</p>
            <p style="font-size:0.9em; color:#777;">Si c'est bien vous (nouveau téléphone, cache vidé...), aucune action nécessaire. Si ce n'est pas vous, contactez-nous immédiatement à <a href="mailto:leerukocc@gmail.com" style="color:#A0895D;">leerukocc@gmail.com</a>.</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('Erreur envoi alerte réactivation:', err);
  }
}

// Génère un code de confirmation à 6 chiffres, valable 10 minutes.
const OTP_VALIDITY_MINUTES = 10;
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Envoie le code de confirmation par e-mail. Retourne true si l'envoi a réussi
// (ou si RESEND_API_KEY n'est pas configuré — cas des tests locaux, où l'on ne
// veut pas bloquer le flux ; dans ce cas le code reste consultable dans Airtable).
async function sendOtpEmail(email, code, otp) {
  if (!process.env.RESEND_API_KEY) return true;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Wolof Express <contact@leerukocc.com>',
        to: email,
        subject: 'Code de confirmation Wolof Express',
        html: `
          <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#3A2A18;">
            <p>Bonjour,</p>
            <p>Quelqu'un essaie d'accéder à votre appli Wolof Express (code <strong>${code}</strong>) depuis un nouvel appareil ou navigateur.</p>
            <p>Pour confirmer que c'est bien vous, entrez ce code de confirmation :</p>
            <p style="font-size:1.6em; font-weight:bold; letter-spacing:0.15em; text-align:center; margin:1em 0;">${otp}</p>
            <p style="font-size:0.9em; color:#777;">Ce code expire dans ${OTP_VALIDITY_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette tentative, ignorez cet e-mail — personne ne pourra rentrer sans ce code.</p>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Erreur envoi OTP:', err);
    return false;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Méthode non autorisée.' }) };
  }

  let code, email, otp;
  try {
    const body = JSON.parse(event.body);
    code = (body.code || '').trim().toUpperCase();
    email = (body.email || '').trim();
    otp = (body.otp || '').trim();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Requête invalide.' }) };
  }

  if (!code || !email) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Code et e-mail requis.' }) };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE, APP_DOWNLOAD_URL, WOLOF_MASTER_CODE } = process.env;

  // Code passe-partout : donne accès sans consommer ni vérifier un code Airtable.
  // Utile pour les démonstrations, les tests, ou l'équipe Leeru Kocc.
  // Sa valeur vit uniquement dans les variables d'environnement Netlify,
  // jamais dans ce fichier ni dans le dépôt Git.
  if (WOLOF_MASTER_CODE && code === WOLOF_MASTER_CODE.trim().toUpperCase()) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        appUrl: (APP_DOWNLOAD_URL || '/app/wolof-express-audio.html') + '?unlocked=1'
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
    const registeredEmail = (record.fields['Email acheteur'] || '').trim().toLowerCase();

    if (statut === 'Utilisé') {
      // Le code a déjà servi. On ne laisse rentrer que la même personne
      // (même e-mail), et seulement après confirmation par un code envoyé
      // à cet e-mail — pour empêcher quelqu'un qui devine juste l'adresse
      // associée à un code de rentrer sans y avoir vraiment accès.
      if (!registeredEmail || registeredEmail !== email.toLowerCase()) {
        return { statusCode: 200, body: JSON.stringify({ success: false, message: 'Ce code a déjà été utilisé.' }) };
      }

      if (!otp) {
        // Étape 1 : pas encore de code de confirmation saisi → on en génère
        // un, on le stocke avec sa date d'expiration, et on l'envoie par e-mail.
        const newOtp = generateOtp();
        const expireAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60000).toISOString();

        await fetch(`${airtableUrl}/${record.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ typecast: true, fields: { OTP: newOtp, 'OTP Expire': expireAt } })
        });

        const sent = await sendOtpEmail(email, code, newOtp);
        if (!sent) {
          return { statusCode: 500, body: JSON.stringify({ success: false, message: "Impossible d'envoyer l'e-mail de confirmation. Réessayez dans un instant." }) };
        }
        return { statusCode: 200, body: JSON.stringify({ success: false, otpRequired: true, message: 'Un code de confirmation vient de vous être envoyé par e-mail.' }) };
      }

      // Étape 2 : un code de confirmation a été saisi → on le vérifie.
      const storedOtp = record.fields['OTP'];
      const otpExpire = record.fields['OTP Expire'];
      if (!storedOtp || otp !== storedOtp || !otpExpire || new Date(otpExpire) < new Date()) {
        return { statusCode: 200, body: JSON.stringify({ success: false, otpRequired: true, message: 'Code de confirmation invalide ou expiré. Redemandez un nouveau code.' }) };
      }

      // Code de confirmation valide : accès accordé, on efface l'OTP consommé.
      await fetch(`${airtableUrl}/${record.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ typecast: true, fields: { OTP: '', 'OTP Expire': '' } })
      });
      await sendReactivationAlert(email, code);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          appUrl: (APP_DOWNLOAD_URL || '/app/wolof-express-audio.html') + '?unlocked=1',
          progress: record.fields['Progression'] || null
        })
      };
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
        appUrl: (APP_DOWNLOAD_URL || '/app/wolof-express-audio.html') + '?unlocked=1',
        progress: record.fields['Progression'] || null
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Erreur serveur. Réessayez dans un instant.' }) };
  }
};
