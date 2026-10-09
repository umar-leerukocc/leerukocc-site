// netlify/functions/create-invoice.js
//
// Crée un paiement Bictorys (Checkout) et renvoie l'URL de paiement au
// client. Appelée depuis wolof-express.html quand le client clique "Acheter".
//
// Attend un POST avec un body JSON : { "email": "...", "product": "app_only" | "book_app" }

const SITE_URL = 'https://leerukocc.com';

// Catalogue des produits vendus. Ajuste les prix ici si besoin.
const PRODUCTS = {
  app_only: {
    label: 'Wolof Express — Accès application',
    amount: 5900,
  },
  book_app: {
    label: 'Wolof Express — Livre + Application',
    amount: 9900,
  },
};

function bictorysApiBase() {
  // En mode test, Bictorys utilise un domaine séparé pour les simulations.
  // En mode live (production), c'est api.bictorys.com.
  return process.env.BICTORYS_MODE === 'live'
    ? 'https://api.bictorys.com'
    : 'https://api.test.bictorys.com';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { email, product } = payload;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide' }) };
  }

  const productInfo = PRODUCTS[product];
  if (!productInfo) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Produit inconnu' }) };
  }

  // Référence unique qui encode le produit en préfixe (ipn-callback.js et
  // confirm-payment.js s'en servent pour retrouver quel produit a été payé,
  // Bictorys n'ayant pas de champ "custom_data" libre comme PayDunya).
  const reference = `${product}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const chargePayload = {
    amount: productInfo.amount,
    currency: 'XOF',
    paymentReference: reference,
    merchantReference: reference,
    successRedirectUrl: `${SITE_URL}/wolof-express.html?paiement=confirme&ref=${encodeURIComponent(reference)}`,
    errorRedirectUrl: `${SITE_URL}/wolof-express.html?paiement=annule`,
    orderDetails: [
      {
        name: productInfo.label,
        price: productInfo.amount,
        quantity: 1,
      },
    ],
    customerObject: {
      email,
      country: 'SN',
      locale: 'fr-FR',
    },
    allowUpdateCustomer: false,
  };

  try {
    const response = await fetch(`${bictorysApiBase()}/pay/v1/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Clé PRIVÉE (secrète) côté serveur — jamais la clé publique ici.
        'X-Api-Key': process.env.BICTORYS_SECRET_KEY,
      },
      body: JSON.stringify(chargePayload),
    });

    const data = await response.json();
    const checkoutUrl = data.link || data.paymentUrl || data.url;

    if (response.ok && checkoutUrl) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkout_url: checkoutUrl, reference }),
      };
    }

    console.error('Erreur Bictorys create-invoice:', data);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Erreur Bictorys', details: data }),
    };
  } catch (err) {
    console.error('Erreur serveur create-invoice:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur' }),
    };
  }
};
