/* config.js – settings, ALL user-facing texts (NL + FR), file-type groups and the search glossary. */
"use strict";
window.LK = window.LK || {};
LK.CFG = {
  APP: "Looky",
  URL: "https://sealink68.github.io/looky/",
  INDEX: "looky-index.json",         // written in the root of each share
  SUBDIR: "projecten",               // ESC_tool working folder: projecten/<Family>/<Dossier>/
  CONTAINERS: ["projecten", "projects", "projets", "projekte", "dossiers"], // normalised; "projecten-like" folders
  SHARES: ["ESC_Share", "ESA_Share"],
  /* OneDrive web folders of the shares (owner's OneDrive, shared with technicians); key = index 'share' name,
     matched case-insensitive and tolerant of "-"/" "/"_" (ESC-Share = ESC_Share). Unknown share -> no OneDrive button. */
  ONEDRIVE: {
    "ESC_Share": "https://dorma-my.sharepoint.com/personal/joachim_lust_dormakaba_com/Documents/ESC_Share",
    "ESA_Share": "https://dorma-my.sharepoint.com/personal/joachim_lust_dormakaba_com/Documents/ESA_Share"
  },
  MAX_RESULTS: 300,
  /* hidden, Office locks, OneDrive sync temps, and Windows junk — not real share files */
  SKIP: /^(?:~\$|\.|desktop\.ini$|thumbs\.db$)|(?:\.tmp(?:\.drivedownload|\.driveupload)?$)/i
};
LK.EXT = {
  param: [".xml", ".prd", ".dat", ".kmc", ".eep", ".mot"],
  office: [".pdf", ".doc", ".docx", ".docm", ".dot", ".dotx", ".xls", ".xlsx", ".xlsm", ".xlsb", ".csv", ".ppt", ".pptx",
    ".pptm", ".pps", ".ppsx", ".odt", ".ods", ".odp", ".rtf", ".txt", ".vsd", ".vsdx", ".one", ".msg"]
};
/* Typical extensions per sub-model. Add a line to extend.
   The key is matched ignoring case, spaces, dashes and underscores (TPB M04 = TPB-M04).
   Optional "Family/Model" limits the default to that family; a bare model id applies to every family. */
LK.MODEL_EXT = {
  "Kerberos/TPB-M04": [".kmc", ".eep"]
};
/* Glossary: each line is one concept; a typed term matching any word also matches all the others (NL/FR/EN/DE).
   Matching is case- and accent-insensitive. Add lines freely. */
LK.GLOSSARY = [
  ["deur", "porte", "door", "tür", "tuer"],
  ["schuifdeur", "porte coulissante", "sliding door", "schiebetür", "schiebetuer"],
  ["draaideur", "porte tournante", "revolving door", "karusselltür", "drehtür"],
  ["draaivleugeldeur", "porte battante", "swing door", "drehflügeltür"],
  ["motor", "moteur", "motor", "antrieb"],
  ["besturing", "commande", "controller", "steuerung", "sturing"],
  ["parameter", "paramètre", "parameter", "parameters", "paramètres", "param"],
  ["firmware", "micrologiciel", "software", "logiciel"],
  ["handleiding", "manuel", "manual", "handbuch", "gebruiksaanwijzing", "mode d'emploi"],
  ["schema", "schéma", "diagram", "schaltplan", "bedradingsschema", "wiring"],
  ["installatie", "installation", "montage", "assembly"],
  ["onderhoud", "entretien", "maintenance", "wartung"],
  ["offerte", "offre", "devis", "quote", "angebot"],
  ["tekening", "plan", "dessin", "drawing", "zeichnung"],
  ["certificaat", "certificat", "certificate", "zertifikat", "attest"],
  ["poort", "portique", "gate", "tor", "portillon"],
  ["tourniquet", "draaihek", "turnstile", "drehkreuz", "tripod"],
  ["sensor", "capteur", "sensor", "detector", "détecteur", "melder"],
  ["voeding", "alimentation", "power supply", "netzteil"],
  ["rapport", "verslag", "report", "bericht"],
  ["foto", "photo", "picture", "bild"],
  ["klant", "client", "customer", "kunde"]
];
LK.T = {
  nl: {
    title: "Looky", sub: "Bestanden zoeken in ESC_Share / ESA_Share", offline: "Offline", help: "Help", close: "Sluiten",
    idxH: "Indexen", idxNone: "Nog geen index geladen. PC: ‘Index bijwerken’. iPhone/iPad: ‘Index laden’ en kies looky-index.json in de share (Bestanden → OneDrive).",
    idxUpdate: "🔄 Index bijwerken", idxLoad: "📂 Index laden (looky-index.json)", idxRenew: "🔓 Toegang toestaan: {s}",
    idxInfo: "{s}: {n} bestanden – index van {d}", idxUse: "Gebruiken", idxDel: "Verwijderen",
    idxBusy: "Bezig met scannen… {n} bestanden", idxDone: "Index geschreven: {s}\\{f}. {n} bestanden geïndexeerd, {k} overgeslagen.",
    idxSum: "{n} bestanden geïndexeerd, {k} overgeslagen.",
    idxWriteErr: "Index gemaakt maar niet kunnen schrijven: {e}", idxErr: "Fout: {e}", idxBad: "Dit is geen geldig looky-index.json-bestand.",
    idxLoaded: "Index geladen: {s} ({n} bestanden, {d}).", idxOld: "Let op: index ouder dan 30 dagen.",
    noFs: "Index bijwerken kan enkel op een PC in Google Chrome of Edge.",
    family: "Productfamilie", submodel: "Submodel", dossier: "Dossiernummer", customer: "Klant / vrije tekst", ftype: "Bestandstype",
    phFamily: "kies of typ…", phSub: "kies of typ…", phDossier: "bv. 12345", phCustomer: "bv. klantnaam, deur, handleiding…",
    tAll: "Alle", tParam: "Parameter/Firmware", tOffice: "Office",
    search: "Zoeken", clear: "Wissen", results: "{n} resultaten", resultsMax: "{n} resultaten (eerste {m} getoond)", noRes: "Geen resultaten.",
    open: "Openen", download: "Downloaden", copy: "Pad kopiëren", onedrive: "Openen in OneDrive", copied: "Gekopieerd!", needPc: "Openen: zoek dit pad in de OneDrive-app.",
    notFound: "Bestand niet gevonden (index verouderd?).",
    helpTxt: [
      "## Zoeken",
      "• Kies of typ een productfamilie en submodel. De lijsten tonen alleen wat in de geladen index staat; je mag ook vrij typen. Hoofdletters, spaties, streepjes en underscores maken niet uit (ES 200 = ES200).",
      "• Een submodel vinkt meteen zijn gebruikelijke extensies aan (bv. Kerberos TPB-M04 → .kmc en .eep) en toont de resultaten. Dossier en klant verfijnen live.",
      "• Bestandstype: vink extensies aan. ‘Parameter/Firmware’, ‘Office’ en ‘Alle’ zetten een groep in één klik.",
      "• Vrije tekst vindt ook vertalingen: ‘deur’ vindt ook ‘porte’, ‘door’, ‘Tür’. Hoofdletters en accenten maken niet uit.",
      "• Resultaten: nieuwste eerst, terwijl je typt.",
      "## Index (PC)",
      "1. Open Looky in Chrome op een PC met OneDrive (ESC_Share/ESA_Share ‘Altijd op dit apparaat behouden’).",
      "2. Klik ‘Index bijwerken’ en kies de hoofdmap van de share. Looky onthoudt de map; na herstart volstaat één klik op ‘Toegang toestaan’.",
      "3. Looky schrijft looky-index.json in de hoofdmap; OneDrive verspreidt het naar iedereen. Iedereen met een PC mag de index bijwerken.",
      "• Tijdelijke OneDrive-bestanden (.tmp, .tmp.drivedownload, .tmp.driveupload, ~$) en bestanden die tijdens het synchroniseren verdwijnen, worden overgeslagen. De index wordt toch geschreven.",
      "4. Op de PC kan je resultaten rechtstreeks openen of downloaden.",
      "• ‘Openen in OneDrive’ (alle toestellen) opent het bestand in de browser/OneDrive-app; dit vraagt internet en toegang tot de gedeelde map.",
      "## iPhone / iPad",
      "1. Zorg dat de OneDrive-app geïnstalleerd is en de share zichtbaar is in Bestanden.",
      "2. Tik ‘Index laden’ en kies looky-index.json in de hoofdmap van ESC_Share en/of ESA_Share.",
      "3. De index blijft bewaard en werkt offline. Laad hem af en toe opnieuw voor de nieuwste stand (datum staat bij de index).",
      "4. Openen: kopieer het pad en zoek het bestand in de OneDrive-app.",
      "## Offline",
      "• Open Looky één keer met internet (of installeer: Chrome-installatie-icoon / Safari → Deel → Zet op beginscherm). Daarna werkt alles offline."
    ]
  },
  fr: {
    title: "Looky", sub: "Rechercher des fichiers dans ESC_Share / ESA_Share", offline: "Hors ligne", help: "Aide", close: "Fermer",
    idxH: "Index", idxNone: "Aucun index chargé. PC : « Mettre à jour l'index ». iPhone/iPad : « Charger l'index » et choisissez looky-index.json dans le partage (Fichiers → OneDrive).",
    idxUpdate: "🔄 Mettre à jour l'index", idxLoad: "📂 Charger l'index (looky-index.json)", idxRenew: "🔓 Autoriser l'accès : {s}",
    idxInfo: "{s} : {n} fichiers – index du {d}", idxUse: "Utiliser", idxDel: "Supprimer",
    idxBusy: "Analyse en cours… {n} fichiers", idxDone: "Index écrit : {s}\\{f}. {n} fichiers indexés, {k} ignorés.",
    idxSum: "{n} fichiers indexés, {k} ignorés.",
    idxWriteErr: "Index créé mais impossible de l'écrire : {e}", idxErr: "Erreur : {e}", idxBad: "Ce n'est pas un fichier looky-index.json valide.",
    idxLoaded: "Index chargé : {s} ({n} fichiers, {d}).", idxOld: "Attention : index de plus de 30 jours.",
    noFs: "La mise à jour de l'index n'est possible que sur PC dans Google Chrome ou Edge.",
    family: "Famille de produit", submodel: "Sous-modèle", dossier: "N° de dossier", customer: "Client / texte libre", ftype: "Type de fichier",
    phFamily: "choisir ou taper…", phSub: "choisir ou taper…", phDossier: "p. ex. 12345", phCustomer: "p. ex. nom du client, porte, manuel…",
    tAll: "Tous", tParam: "Paramètre/Firmware", tOffice: "Office",
    search: "Rechercher", clear: "Effacer", results: "{n} résultats", resultsMax: "{n} résultats ({m} premiers affichés)", noRes: "Aucun résultat.",
    open: "Ouvrir", download: "Télécharger", copy: "Copier le chemin", onedrive: "Ouvrir dans OneDrive", copied: "Copié !", needPc: "Ouvrir : cherchez ce chemin dans l'app OneDrive.",
    notFound: "Fichier introuvable (index périmé ?).",
    helpTxt: [
      "## Rechercher",
      "• Choisissez ou tapez une famille et un sous-modèle. Les listes ne montrent que ce qui est dans l'index chargé ; la saisie libre reste possible. Majuscules, espaces, tirets et underscores sont ignorés (ES 200 = ES200).",
      "• Un sous-modèle coche tout de suite ses extensions habituelles (p. ex. Kerberos TPB-M04 → .kmc et .eep) et affiche les résultats. Dossier et client affinent en direct.",
      "• Type de fichier : cochez les extensions. « Paramètre/Firmware », « Office » et « Tous » règlent un groupe en un clic.",
      "• Le texte libre trouve aussi les traductions : « porte » trouve aussi « deur », « door », « Tür ». Majuscules et accents sans importance.",
      "• Résultats : les plus récents d'abord, pendant la saisie.",
      "## Index (PC)",
      "1. Ouvrez Looky dans Chrome sur un PC avec OneDrive (ESC_Share/ESA_Share « Toujours conserver sur cet appareil »).",
      "2. Cliquez « Mettre à jour l'index » et choisissez le dossier racine du partage. Looky retient le dossier ; après redémarrage, un clic sur « Autoriser l'accès » suffit.",
      "3. Looky écrit looky-index.json à la racine ; OneDrive le diffuse à tous. Toute personne avec un PC peut mettre l'index à jour.",
      "• Les fichiers temporaires OneDrive (.tmp, .tmp.drivedownload, .tmp.driveupload, ~$) et ceux qui disparaissent pendant la synchronisation sont ignorés. L'index est quand même écrit.",
      "4. Sur PC, vous pouvez ouvrir ou télécharger les résultats directement.",
      "• « Ouvrir dans OneDrive » (tous les appareils) ouvre le fichier dans le navigateur/l'app OneDrive ; il faut internet et l'accès au dossier partagé.",
      "## iPhone / iPad",
      "1. Installez l'app OneDrive ; le partage doit être visible dans Fichiers.",
      "2. Touchez « Charger l'index » et choisissez looky-index.json à la racine d'ESC_Share et/ou d'ESA_Share.",
      "3. L'index reste enregistré et fonctionne hors ligne. Rechargez-le de temps en temps (la date est affichée).",
      "4. Ouvrir : copiez le chemin et cherchez le fichier dans l'app OneDrive.",
      "## Hors ligne",
      "• Ouvrez Looky une fois avec Internet (ou installez-la : icône d'installation Chrome / Safari → Partager → Sur l'écran d'accueil). Ensuite tout fonctionne hors ligne."
    ]
  }
};
