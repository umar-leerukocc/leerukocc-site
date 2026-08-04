// netlify/functions/create-invoice.js
//
// Crée une facture PayDunya (Checkout Invoice) et renvoie l'URL de paiement
// au client. Appelée depuis wolof-express.html quand le client clique "Acheter".
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

function paydunyaApiBase() {
  // En mode test, PayDunya utilise un domaine "sandbox-api" séparé.
  // En mode live (production), c'est "api".
  return process.env.PAYDUNYA_MODE === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';
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

  const invoicePayload = {
    invoice: {
      total_amount: productInfo.amount,
      description: productInfo.label,
      items: {
        item_0: {
          name: productInfo.label,
          quantity: 1,
          unit_price: productInfo.amount,
          total_price: productInfo.amount,
        },
      },
    },
    store: {
      name: 'Leeru Kocc',
      tagline: 'Wolof Express — Apprends le wolof',
      website_url: SITE_URL,
    },
    actions: {
      cancel_url: `${SITE_URL}/wolof-express.html?paiement=annule`,
      return_url: `${SITE_URL}/wolof-express.html?paiement=confirme`,
      callback_url: `${SITE_URL}/.netlify/functions/ipn-callback`,
    },
    custom_data: {
      buyer_email: email,
      product,
    },
  };

  try {
    const response = await fetch(`${paydunyaApiBase()}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-PUBLIC-KEY': process.env.PAYDUNYA_PUBLIC_KEY,
        'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
      },
      body: JSON.stringify(invoicePayload),
    });

    const data = await response.json();

    // Succès : response_code "00" et response_text contient l'URL de paiement
    if (data.response_code === '00') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkout_url: data.response_text, token: data.token }),
      };
    }

    console.error('Erreur PayDunya create-invoice:', data);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Erreur PayDunya', details: data.response_text || data }),
    };
  } catch (err) {
    console.error('Erreur serveur create-invoice:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur' }),
    };
  }
};
