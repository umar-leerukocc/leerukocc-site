// ============================================================
// assets/i18n.js — Sélecteur de langue FR/EN pour tout le site
// ============================================================
// Fonctionnement : chaque élément traduisible porte un attribut
// data-i18n="cle". Le texte français est capturé automatiquement
// depuis le HTML existant au premier chargement (pas besoin de le
// dupliquer ici) ; ce fichier ne contient que les traductions
// anglaises, organisées par page via data-page="..." sur <body>.
//
// Pour ajouter une page : ajouter <body data-page="nomdepage">,
// des attributs data-i18n="cle" sur les éléments à traduire, et
// une entrée dans PAGES ci-dessous avec les traductions anglaises.
// ============================================================

(function () {
  const STORAGE_KEY = 'leerukoccLang';
  let lang = localStorage.getItem(STORAGE_KEY) || 'fr';
  const originals = new WeakMap();

  // ── Navigation (partagée par toutes les pages) ──────────────
  const NAV_EN = {
    nav_accueil: 'Home',
    nav_apprendreWolof: 'Learn Wolof',
    nav_cours: 'Wolof Courses',
    nav_consultance: 'Consulting &amp; Translation',
    nav_decoder: 'Decode Senegal',
    nav_catalogue: 'Catalogue',
    nav_apropos: 'About',
    nav_galerie: 'Gallery',
    nav_wolofExpress: 'Wolof Express',
    nav_contact: 'Contact',
  };

  // ── Pied de page (partagé) ──────────────────────────────────
  const FOOTER_EN = {
    footer_tagline_a: 'A cabinet dedicated to promoting Senegalese languages and cultures. Books, methods, and digital tools.',
    footer_tagline_b: 'Books, courses, consulting, and digital tools.',
    footer_navTitle: 'Navigation',
    footer_contactTitle: 'Contact',
    footer_rights: 'All rights reserved',
  };

  // ── Messages de formulaires (partagés) ──────────────────────
  const FORM_MSG_EN = {
    msg_sending: 'Sending…',
    msg_sent: "Request sent! We'll get back to you shortly.",
    msg_sendError: 'Something went wrong. Please try again.',
    msg_connError: 'Connection error. Please try again.',
    msg_choose: 'Choose…',
  };

  // ── Traductions par page ────────────────────────────────────
  const PAGES_EN = {

    index: {
      idx_heroEyebrow: 'Cultural promotion cabinet',
      idx_h1: 'Materialize the immaterial.<br><span style="color:var(--or);">Jàng, xam, jàngale.</span>',
      idx_subtitle: 'Learn, know, and pass it on.',
      idx_heroP: "Leeru Kocc aims to break down language barriers to democratize knowledge and access to reliable information.",
      idx_btnDiscover: 'Discover Wolof Express',
      idx_btnCatalogue: 'View the catalogue',
      idx_terrainLabel: 'In the field',
      idx_terrainTitle: 'A language that lives, is lived, and is studied.',
      idx_terrainP: 'Classes, workshops, meetings: Wolof engaged in real use, with learners and partners who trust us.',
      idx_activitesLabel: 'Our activities',
      idx_activitesTitle: 'Beyond books',
      idx_activitesIntro: 'Leeru Kocc also offers tailor-made Wolof courses and language support for institutions and individuals.',
      idx_card1Meta: 'Training',
      idx_card1Title: 'Wolof Courses',
      idx_card1P: 'One-on-one or group, in person or online: at your own pace.',
      idx_card1Link: 'Discover our courses →',
      idx_card2Meta: 'Expertise',
      idx_card2Title: 'Language Consulting',
      idx_card2P: 'Support for institutions, NGOs, and international organizations.',
      idx_card2Link: 'Learn more →',
      idx_card3Meta: 'Service',
      idx_card3Title: 'Translation',
      idx_card3P: 'Wolof ↔ French, English → Wolof, with a commitment to cultural accuracy.',
      idx_card3Link: 'Request a quote →',
      idx_ouvragesLabel: 'Listening in',
      idx_ouvragesTitle: 'Our books',
      idx_ouvragesIntro: "Methods designed for real learners, literary texts in Wolof and French, and tools built for use, not just for the shelf.",
      idx_book1Meta: 'Discovering Wolof',
      idx_book1P: 'A discovery of Wolof through its pronouns, for new learners and native speakers curious about how their language works alike.',
      idx_book1Link: 'Learn more →',
      idx_book2Meta: 'Pocket guide + audio app',
      idx_book2P: 'The essential Wolof phrases, pronounced for you. A book that talks: thanks to the included companion app.',
      idx_book2Link: 'Discover →',
      idx_book3Meta: 'Literature · 2021',
      idx_book3P: 'A literary text that questions existence through Senegalese language and thought.',
      idx_book3Link: 'Learn more →',
      idx_citation: '"A language is not worn out by use; it lives by it."',
      idx_citeAuthor: 'The spirit of the Leeru Kocc house',
      idx_maisonLabel: 'The house',
      idx_maisonTitle: 'A home for Senegalese languages',
      idx_maisonIntro: "Founded by Oumar Sow Diagne, Leeru Kocc is a house designed to keep Wolof and Senegal's languages alive, passed down, and reinvented, at home, at school, and beyond borders.",
      idx_maisonBtn: 'Discover the house',
      idx_confianceLabel: 'Trust',
      idx_confianceTitle: 'They trust us',
      idx_confianceIntro: "Public institutions, international organizations, and cultural players we've collaborated with.",
      idx_galerieLabel: 'In pictures',
      idx_galerieTitle: 'Gallery',
      idx_galerieBtn: 'View the full gallery →',
    },

    cours: {
      crs_heroEyebrow: 'Training · Individual &amp; group',
      crs_h1: 'Learn Wolof with Leeru Kocc',
      crs_heroP: "In-person classes in Dakar or online, tailored to your pace, whether you're starting from scratch or refining skills you already have.",
      crs_btnDemande: 'Make a request',
      crs_practLabel: 'In class',
      crs_practTitle: 'Courses grounded in practice',
      crs_practP: 'Grammar, vocabulary, role-play: every session combines linguistic rigor with real-world use, both spoken and written.',
      crs_formatsLabel: 'Formats',
      crs_formatsTitle: 'A format for every need',
      crs_formatsIntro: 'All courses can be taken in person (Dakar) or online, one-on-one or in a small group.',
      crs_c1Meta: 'Option',
      crs_c1Title: 'One-on-one course',
      crs_c1P: 'Personalized support, paced to your level and goals: travel, family, work, or cultural curiosity.',
      crs_c2Meta: 'Option',
      crs_c2Title: 'Group course',
      crs_c2P: 'A friendly dynamic among learners of similar levels, in person or via video call.',
      crs_c3Meta: 'Format',
      crs_c3Title: 'In person: Dakar',
      crs_c3P: 'Face-to-face sessions, at our premises or at your home depending on availability.',
      crs_c4Meta: 'Format',
      crs_c4Title: 'Online: anywhere',
      crs_c4P: 'Video call classes, accessible from the diaspora or anywhere in Senegal.',
      crs_inscriptionLabel: 'Registration',
      crs_inscriptionTitle: 'Request a course',
      crs_inscriptionIntro: "Describe what you're looking for: we'll get back to you quickly to sort out timing and details.",
      crs_labelNom: 'Full name',
      crs_labelEmail: 'Email',
      crs_labelTel: 'Phone (WhatsApp preferred)',
      crs_labelFormule: 'Preferred option',
      crs_opt1: 'Individual: In person',
      crs_opt2: 'Individual: Online',
      crs_opt3: 'Group: In person',
      crs_opt4: 'Group: Online',
      crs_opt5: 'Not decided yet',
      crs_labelNiveau: 'Current level',
      crs_niv1: 'Complete beginner',
      crs_niv2: 'Some basics',
      crs_niv3: 'Intermediate',
      crs_niv4: 'Advanced: fine-tuning',
      crs_labelDispo: 'Availability / message',
      crs_btnEnvoyer: 'Send request',
    },

    consultance: {
      con_h1: 'Consulting &amp; Translation',
      con_heroP: 'Wolof language expertise for institutions, businesses, and individuals.',
      con_c1Meta: '01: Language consulting',
      con_c1Title: 'Language consulting',
      con_c1P: 'Support for institutions, NGOs, and international organizations: evaluation of Wolof-language content, pedagogical advice, language-inclusion expertise, and collaboration on cultural preservation projects.',
      con_c2Meta: '02: Translation',
      con_c2Title: 'Translation',
      con_c2P: 'Translation of documents, educational content, and institutional or editorial materials, with careful attention to cultural accuracy, not just literal accuracy.',
      con_c2Langs: 'Wolof → French · French → Wolof · English → Wolof',
      con_c3Meta: '03: Communication',
      con_c3Title: 'Communication',
      con_c3P: 'Speechwriting and awareness campaigns, institutional and community communication, Wolof-language audiovisual production, and content localization.',
      con_c4Meta: '04: Instructional design',
      con_c4Title: 'Instructional design',
      con_c4P: 'Curriculum development and textbook design, creation of educational games and digital platforms, and language-skills assessment.',
      con_devisLabel: 'Quote',
      con_devisTitle: 'Request a quote',
      con_devisIntro: "Describe your project: we'll get back to you with a tailored proposal.",
      con_labelNom: 'Name / Organization',
      con_labelEmail: 'Email',
      con_labelTel: 'Phone',
      con_labelService: 'Service needed',
      con_s1: 'Language consulting',
      con_s2: 'Translation',
      con_s3: 'Communication',
      con_s4: 'Instructional design',
      con_s5: 'Other / to discuss',
      con_labelDesc: 'Project description',
      con_btnEnvoyer: 'Send request',
    },

    catalogue: {
      cat_h1: 'Catalogue',
      cat_heroP: 'Methods, literature, and digital tools for Wolof and Senegalese cultures.',
      cat_b1Meta: 'Discovering Wolof · 2023',
      cat_b1P: "This book is a discovery of Wolof, a fascinating little journey for those approaching it as a foreign language as much as for the many native speakers who don't fully understand how it works. A teaching guide without being academic, it approaches the language through its pronouns, an approach that helps learners quickly gain semi-independence. A course resource for all levels.",
      cat_b2Tag: 'Coming soon',
      cat_b2Title: 'Comprendre et Parler Wolof<br><span style="font-size:0.65rem;font-weight:400;">The method</span>',
      cat_b2Meta: 'Method · Volume II',
      cat_b2P: 'The progressive method for learning spoken and written Wolof: structured lessons, authentic dialogues, and exercises aligned with the skills taught, from beginner level to conversational independence.',
      cat_b3Meta: 'Pocket guide + audio app · 2026',
      cat_b3P1: 'The essential Wolof phrases for traveling, connecting, and being understood, paired with an exclusive audio app for book buyers.',
      cat_b3P2: '"This guide won\'t make you a Wolof speaker. But it will open the hearts of Senegalese people to you."',
      cat_b3Link: 'Discover the book →',
      cat_b4Meta: 'Literature · 2021',
      cat_b4P: 'A literary text that questions existence and thought through the Senegalese language.',
      cat_b5Meta: 'Literature · 2017',
      cat_b5P: 'A story about childhood, school, and passing things down, the first book published under Leeru Kocc.',
    },

    apropos: {
      apr_h1: 'A cultural promotion cabinet, through language',
      apr_heroP: 'Leeru Kocc, the house of knowledge, rooted in Wolof.',
      apr_quiLabel: 'Who we are',
      apr_p1: 'Leeru Kocc is a Senegalese cultural promotion cabinet that places Wolof at the center of its work, both as a medium and as a product. As a medium, Wolof is the vehicle through which a culture, a way of thinking, and an identity are passed on, and through which educational, social, and economic transformations take place. As a product, it is the subject of direct work: courses, tools, content, and resources that the cabinet designs, builds, and distributes.',
      apr_p2: "These two dimensions aren't opposed: it's by turning Wolof into a well-mastered product, taught, written, equipped with tools, that the cabinet gives it the means to act as a medium of cultural transformation.",
      apr_p3: 'Inspired by the intellectual legacy of <strong>Kocc Barma Fall</strong>, a Senegalese symbol of wisdom and mastery of the spoken word, Leeru Kocc starts from a conviction: a culture that no longer expresses itself in its own language loses part of its capacity to think, pass on knowledge, and reinvent itself. Keeping Wolof alive means keeping a heritage alive, a way of seeing the world and a resource for the future.',
      apr_p4: 'The cabinet supports public institutions, international organizations, businesses, academic institutions, and individuals, using language to carry projects in cultural promotion, training, communication, and instructional design.',
      apr_p5: 'Leeru Kocc, "the light of Kocc," makes language the best tool for cultural integration. The cabinet offers services built around languages, primarily Wolof, spoken by more than 80% of the population, and French, the official language.',
      apr_p6: 'Leeru Kocc aims to break down language barriers to democratize knowledge and access to reliable information, through literacy programs, language courses, translation, and subtitling of practical documents.',
      apr_p7: 'The cabinet has solid experience in literacy training adapted to a range of professional contexts. Courses are led by experienced teachers skilled in designing courses around specific objectives. Its distinctive approach: relying on local languages, primarily Wolof, for faster reading independence, along with personalized support outside of class.',
      apr_visionLabel: 'Our vision',
      apr_visionP: "Making Senegalese and African culture, carried by its national languages, a fully recognized lever for knowledge, development, and innovation: in education, administration, the economy, media, and technology.",
      apr_missionLabel: 'Our mission',
      apr_mission: '<li>Promote Senegalese culture by using Wolof as a living medium</li><li>Teach, write, and build tools for Wolof as a product in its own right, with rigor and precision</li><li>Advance research in linguistics and pedagogy in service of cultural transmission</li><li>Produce innovative resources and educational tools rooted in cultural heritage</li><li>Train speakers able to carry this culture into professional, academic, and institutional settings</li><li>Support institutions in integrating national languages and cultures</li><li>Contribute to the influence of African cultures through their languages</li>',
      apr_expertiseLabel: 'Expertise',
      apr_expertiseTitle: 'Our areas of expertise',
      apr_e1Title: 'Language training',
      apr_e1: '<li>Spoken, reading, and writing Wolof</li><li>Wolof as a foreign / second language</li><li>Professional communication in Wolof</li><li>Wolof for expatriates, diplomats, and international organizations</li><li>Training for trainers and teachers</li>',
      apr_e2Title: 'Linguistic research',
      apr_e2: '<li>Grammatical description and lexicography</li><li>Terminology and language standardization</li><li>Sociolinguistic studies</li><li>Didactics of African languages</li>',
      apr_e3Title: 'Translation',
      apr_e3: '<li>Wolof ↔ French</li><li>English → Wolof</li><li>Cultural adaptation of content</li><li>Linguistic proofreading</li>',
      apr_e4Title: 'Communication',
      apr_e4: '<li>Speechwriting, awareness campaigns</li><li>Institutional and community communication</li><li>Wolof-language audiovisual production</li><li>Content localization</li>',
      apr_e5Title: 'Instructional design',
      apr_e5: '<li>Curriculum development and textbook design</li><li>Creation of educational games and digital platforms</li><li>Language-skills assessment</li><li>AI applied to African languages</li>',
      apr_e6Title: 'Who we serve',
      apr_e6P: 'Public administrations · International organizations · NGOs · Businesses · Schools and universities · Research centers · Media · Local authorities · Associations · Individuals',
      apr_produitsLabel: 'In practice',
      apr_produitsTitle: 'Our offerings',
      apr_produitsIntro: "This is where Wolof-as-a-product takes concrete shape.",
      apr_prod1: '✦ Individual and group courses',
      apr_prod2: '✦ Wolof reading and writing masterclasses',
      apr_prod3: '✦ Online courses and WhatsApp courses',
      apr_prod4: '✦ Conversation cards',
      apr_prod5: '✦ Educational games',
      apr_prod6: '✦ Digital learning tools',
      apr_citation: '"A culture transforms and passes itself on when its language is alive: learned, spoken, written, created, administered."',
      apr_citeAuthor: 'Our approach',
      apr_afterCitationP: 'That\'s why Leeru Kocc constantly combines scientific rigor, active pedagogy, and innovation, not to teach a language in isolation, but to make that language the common thread of a broader cultural transformation.',
      apr_whyLabel: 'Why choose Leeru Kocc?',
      apr_why: '<li>A culture-first approach, where language is a means, not an end</li><li>Wolof expertise backed by a research arm and genuine sociolinguistic grounding</li><li>Training and tools designed for Senegalese realities, not adapted from a generic model</li><li>A team committed to promoting African cultures and languages</li>',
      apr_ambitionLabel: 'Our ambition',
      apr_ambitionP: "Making Leeru Kocc an African reference in cultural promotion through language, training, research, translation, communication, and instructional design, and helping build an Africa where national cultures, carried by their languages, take their full place in tomorrow's knowledge production and innovation.",
      apr_fondateurLabel: 'Founder',
      apr_fondP1: 'Founder of Leeru Kocc, Oumar Sow Diagne is a philosopher, author, and educator specializing in Wolof pedagogy and French as a foreign language teaching. He also writes under the pen name Umar Sow Jaañ for his literary and philosophical work.',
      apr_fondP2: 'His work rests on a conviction: the very structures of Senegalese languages carry their own way of thinking, one that deserves to be studied, written, and passed on in its own terms.',
    },

    galerie: {
      gal_h1: 'Gallery',
      gal_heroP: 'Classes, workshops, institutional meetings: a look at our work in the field.',
    },

    contact: {
      cta_h1: 'Contact',
      cta_heroP: 'A question, a project, a bulk order? Get in touch.',
      cta_coordLabel: 'Contact details',
      cta_coordTitle: "Let's stay in touch",
      cta_coordP: "For any question about our books, a partnership request, or an issue activating the Wolof Express app.",
      cta_stepEmailTitle: 'Email',
      cta_stepTelTitle: 'Phone',
      cta_stepLocTitle: 'Location',
      cta_stepLocVal: 'Dakar, Senegal',
      cta_formTitle: 'Send a message',
      cta_labelNom: 'Name',
      cta_labelEmail: 'Email',
      cta_labelMessage: 'Message',
      cta_btnEnvoyer: 'Send',
    },

    wolofExpress: {
      wex_heroEyebrow: 'Audio app + pocket guide · Leeru Kocc',
      wex_h1: 'Everyday Wolof,<br>in your pocket.',
      wex_heroP: "An audio app to hear and speak everyday Wolof, phrase by phrase, pronounced by native speakers. And a book to understand its codes. The app gets you speaking, the book helps you understand.",
      wex_btnAcheter: 'Buy the app &rarr;',
      wex_btnTryFree: 'Try for free &rarr;',
      wex_btnHaveCode: 'I already have a code',
      wex_pairLabel: 'Two companions, two roles',
      wex_pairTitle: "Speaking and understanding aren't the same thing",
      wex_appMeta: 'The app, the voice',
      wex_appTitle: 'To speak',
      wex_appP: 'Hear every phrase pronounced by native speakers, repeat it, test your pronunciation and track your progress, theme by theme. It even works offline.',
      wex_bookMeta: 'The book, the codes',
      wex_bookTitle: 'To understand',
      wex_bookP: 'The descriptions and cultural notes that give meaning to every expression: why people take time to greet each other, how to haggle without offending, what teranga really means.',
      wex_pairTagline: 'The book in your hand to understand, the app in your ear to speak.',
      wex_stepsLabel: 'How it works',
      wex_stepsTitle: 'Three steps, once and for all',
      wex_step1Title: 'Choose your option',
      wex_step1P: 'App only or Duo Pack, paid online by Mobile Money (Wave, Orange Money) or bank card.',
      wex_step2Title: 'Get your code',
      wex_step2P: "It appears on screen right after payment and is also sent to you by email.",
      wex_step3Title: 'Activate and listen',
      wex_step3P: 'Enter your code and email below: access to the app is permanent, and your progress is saved.',
      wex_buyLabel: 'Buy online',
      wex_buyTitle: 'Choose your option',
      wex_buyIntro: 'Your activation code is provided immediately after payment.',
      wex_labelEmail: 'Your email',
      wex_acceptCgv: 'I accept the <a href="cgv.html" target="_blank" rel="noopener">Terms of Sale</a> and the <a href="confidentialite.html" target="_blank" rel="noopener">Privacy Policy</a>, and I acknowledge that access to the digital product is provided immediately after payment.',
      wex_offerAppTitle: 'App only',
      wex_offerAppP: 'Hear and speak everyday Wolof, phrase by phrase. Permanent access.',
      wex_btnAppOnly: 'Buy the app',
      wex_offerDuoTag: 'To give',
      wex_offerDuoTitle: 'Duo Pack',
      wex_offerDuoP: 'Two app access codes: one for you, one to give. Ideal for a couple, a family settling in, or a gift.',
      wex_btnDuo: 'Buy the Duo Pack',
      wex_bookLabel: 'The book',
      wex_bookSecTitle: 'Leaf through the book, now on pre-order',
      wex_bookSecP: "The app's companion: the cultural codes and descriptions that give meaning to every word. Ten themes, from greetings to teranga, through the market, getting around and time, plus a pocket glossary. Release planned for December 2026.",
      wex_bookOnlyTitle: 'The book',
      wex_bookOnlyP: 'The cultural codes and descriptions, to keep at hand or to give.',
      wex_preorderTag: 'Pre-order',
      wex_btnOrderBook: 'Pre-order on WhatsApp',
      wex_bundleTag: 'The complete duo',
      wex_bundleTitle: 'Book + App',
      wex_bundleP: 'The book to understand and the app to speak. Your activation code will be handed to you with the book, on release.',
      wex_btnOrderBundle: 'Pre-order on WhatsApp',
      wex_preorderNote: 'No payment at this stage: we will contact you as soon as the book is released to confirm your order. Want to start right away? <a href="#acheter">The app is available now.</a>',
      wex_orderMailNote: 'Prefer email? Write to <a href="mailto:contact@leerukocc.com?subject=Pr%C3%A9commande%20Wolof%20Express">contact@leerukocc.com</a> stating your choice.',
      wex_activerLabel: 'Activation',
      wex_activerTitle: 'Unlock your audio app',
      wex_activerIntro: "Your code was sent to you by email after purchase. It is activated once, with your email. Changing device? Enter the same code and email: a confirmation code will be sent to you, and your progress will be restored.",
      wex_labelCode: 'Access code',
      wex_labelOtp: 'Confirmation code received by email',
      wex_btnActiver: 'Activate the app',
    },

    decoderSenegal: {
      dec_heroEyebrow: 'Leeru Kocc &times; Momentum &middot; Intercultural management training',
      dec_h1: 'Decode Senegal',
      dec_heroP: "The workshop that gives your managers the cultural keys to effectively lead a Senegalese team, in half a day. No abstract theory: real cases, role-play, and tools your teams use starting the next day.",
      dec_btnFormats: 'Discover the workshop &rarr;',
      dec_btnContact: 'Contact us',

      dec_factFormatLabel: 'Format',
      dec_factFormat: 'In-person, interactive workshop (field cases + role-play)',
      dec_factDureeLabel: 'Duration',
      dec_factDuree: 'From 2 hours to a full day, depending on your needs',
      dec_factLieuLabel: 'Venue',
      dec_factLieu: 'To be defined together based on your needs',
      dec_factPublicLabel: 'Audience',
      dec_factPublic: 'Managers and executives working in Senegal',

      dec_s1Label: 'The observation',
      dec_s1Title: 'Cultural misunderstandings, not skill problems',
      dec_s1P1: "A manager who doesn't get what he asked for. An employee who says \u201cyes\u201d and doesn't follow through. A loyal team that never takes initiative. These aren't skill problems: they're cultural misunderstandings, and they cost time, trust and performance.",
      dec_s1P2: "What no one says clearly: the problem isn't one-sided. Senegalese employees, too, have things to say about what they don't understand in their Western managers. This mutual silence is at the heart of the most costly blockages, and it's exactly what the workshop sets out to untangle.",

      dec_s2Label: 'What you walk away with',
      dec_s2Title: 'Tools to use starting the next day, not just awareness',
      dec_take1Title: 'You understand what\u2019s really blocking things',
      dec_take1P: "Why your instructions aren't followed as expected, why your meetings stay silent: you identify the precise cultural codes at play, not a vague explanation.",
      dec_take2Title: 'A personal Intercultural Passport',
      dec_take2P: 'The 5 golden rules and a behavior translator, in a format you keep and refer back to after the workshop.',
      dec_take3Title: 'Reflexes tested in the room',
      dec_take3P: '4 scenarios played out through role-play, so new behaviors are practiced, not just understood intellectually.',
      dec_take4Title: 'A concrete commitment, not an intention',
      dec_take4P: 'You leave with a personal commitment to change, written down at the end of the session, not just awareness that fades within a week.',

      dec_s2bLabel: 'How the workshop unfolds',
      dec_s2bTitle: 'Four stages, from lived cases to a personal commitment',
      dec_proc1Title: '1. Field cases',
      dec_proc1P: 'We start from real situations experienced by managers in Senegal: 70 cultural codes documented on the ground in Dakar, organized into 24 compared dimensions.',
      dec_proc2Title: '2. A two-way reading',
      dec_proc2P: 'For each case, you discover both your own blind spot as a foreign manager and what your Senegalese colleagues don\u2019t understand about you. Both directions, not just one.',
      dec_proc3Title: '3. Role-play',
      dec_proc3P: '4 scenarios played out in the room to anchor new reflexes in practice, not just in theory.',
      dec_proc4Title: '4. Passport &amp; commitment',
      dec_proc4P: 'You leave with the 5 golden rules, the behavior translator, and a personal commitment to act, written down at the end of the session.',

      dec_s3Label: 'Two perspectives, one shared conviction',
      dec_s3Title: 'Co-led by two complementary practitioners',
      dec_bio1P: 'Philosopher, linguist and expert in Senegalese cultures. Author of <em>Comprendre et Parler Wolof</em> and <em>Wolof Express</em>. Pedagogical director at Leeru Kocc, he teaches Wolof and French at the Institut Fran&ccedil;ais de Dakar. His background includes assignments with UNESCO, AFD and several embassies. He brings anthropological depth, on-the-ground cultural codes, and the ability to name what usually stays invisible.',
      dec_bio2P: 'Expert in management and organizational development. She brings a managerial and HR lens, an international perspective on leadership practices, and grounding in the operational realities of companies working in Senegal. Her stance: neither indulgent nor prescriptive, clear-eyed about the friction, pragmatic about the solutions.',

      dec_s4Label: 'Who is it for?',
      dec_s4Title: 'Any organization facing Senegalese cultural codes',
      dec_s4P: "The work always centers on the same axis: the Senegalese context. This isn't a general intercultural mediation workshop between any two cultures, but it works both ways around that axis.",
      dec_s4aTitle: 'Foreign managers and executives',
      dec_s4aP: "Whatever your own nationality, French, European, American or otherwise, if you manage a Senegalese team, the workshop gives you the keys to read what's really going on in your exchanges with them.",
      dec_s4bTitle: 'Senegalese managers and teams',
      dec_s4bP: "If you work with a manager or colleagues from another culture, the workshop also helps you understand their own codes, and name what isn't always clear to you about them either.",
      dec_s4P2: 'Concretely: leadership teams of companies based in Senegal, embassies and cooperation agencies, international organizations and NGOs, chambers of commerce, HR departments managing expatriate staff, and Senegalese managers trained abroad who come back with effective tools and run into resistance they can\u2019t quite name.',
      dec_btnDevis: 'Request a quote &rarr;',

      dec_s6Label: 'The venue',
      dec_s6Title: 'A setting chosen together, not imposed',
      dec_s6P: "The venue isn't a logistical detail, it's a pedagogical choice: it needs to create the conditions for speech, vulnerability and the shift in perspective this kind of work requires. The workshop can be held at your own premises or at a cultural venue in Dakar such as La galerie Le Man&egrave;ge, depending on what suits your team best. We discuss it together when you request a quote.",

      dec_closing: "Managing in Senegal without the cultural codes is like flying without instruments. \u201cDecode Senegal\u201d doesn't turn managers into experts on Senegalese culture, it gives them the keys to ask the right questions, interpret what they see, and act differently. This isn't awareness-raising. It's a shift in posture.",
      dec_btnContact2: 'Contact us &rarr;',
    },
  };

  function getDict() {
    const page = document.body.dataset.page;
    return Object.assign({}, NAV_EN, FOOTER_EN, FORM_MSG_EN, PAGES_EN[page] || {});
  }

  function applyLang() {
    const dict = getDict();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (!originals.has(el)) originals.set(el, el.innerHTML);
      if (lang === 'en' && dict[key] !== undefined) {
        el.innerHTML = dict[key];
      } else {
        el.innerHTML = originals.get(el);
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (!originals.has(el)) originals.set(el, el.getAttribute('placeholder') || '');
      if (lang === 'en' && dict[key] !== undefined) {
        el.setAttribute('placeholder', dict[key]);
      } else {
        el.setAttribute('placeholder', originals.get(el));
      }
    });
    const btn = document.getElementById('langToggle');
    // Drapeaux dessinés en SVG : les emojis de drapeaux ne s'affichent pas sous Windows
    // (Windows montre les lettres « GB » / « FR » à la place).
    const FLAG_UK = '<svg viewBox="0 0 60 30" width="20" height="10" aria-hidden="true" style="vertical-align:-1px;border-radius:2px;margin-right:6px;"><clipPath id="lkUkClip"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#lkUkClip)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></svg>';
    const FLAG_FR = '<svg viewBox="0 0 3 2" width="18" height="12" aria-hidden="true" style="vertical-align:-1px;border-radius:2px;margin-right:6px;"><rect width="1" height="2" x="0" fill="#002395"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#ED2939"/></svg>';
    if (btn) {
      btn.innerHTML = lang === 'fr' ? FLAG_UK + 'EN' : FLAG_FR + 'FR';
      btn.setAttribute('aria-label', lang === 'fr' ? 'Switch to English' : 'Passer en français');
    }
    document.documentElement.lang = lang;
  }

  function injectToggle() {
    if (document.getElementById('langToggle')) return;
    const wrap = document.querySelector('.site-nav .wrap');
    if (!wrap) return;
    const btn = document.createElement('button');
    btn.id = 'langToggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'English / Français');
    btn.style.cssText = 'order:2;display:inline-flex;align-items:center;margin-left:0.6rem;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.5);color:#FFF;border-radius:0.5rem;padding:0.4rem 0.8rem;font-family:"Lato",sans-serif;font-weight:700;font-size:0.82rem;cursor:pointer;letter-spacing:0.5px;flex-shrink:0;';
    btn.addEventListener('click', () => {
      lang = lang === 'fr' ? 'en' : 'fr';
      localStorage.setItem(STORAGE_KEY, lang);
      applyLang();
    });
    const navToggle = document.getElementById('navToggle');
    if (navToggle) {
      navToggle.style.order = '3';
      navToggle.insertAdjacentElement('beforebegin', btn);
    } else {
      wrap.appendChild(btn);
    }
    wrap.style.display = wrap.style.display || 'flex';
    wrap.style.alignItems = wrap.style.alignItems || 'center';
  }

  // Exposé pour les scripts inline de chaque page (messages de formulaire dynamiques)
  window.leerukoccLang = () => lang;
  window.leerukoccT = (key) => {
    const dict = getDict();
    return lang === 'en' && dict[key] !== undefined ? dict[key] : null;
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    injectToggle();
    applyLang();
  });
})();
