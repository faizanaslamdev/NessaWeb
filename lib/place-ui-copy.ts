/**
 * Product UI copy for public Place + Place Chat web (not UGC / Place names).
 * Languages with dedicated strings: en, es, pt, fr, de.
 * Other APP_CHAT_LANGUAGES codes fall back to English for UI only —
 * chat message translation still uses the visitor's preferred language.
 */

import { DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import { resolveAppLanguageCode } from '@/lib/web-ui-locale'

export type PlaceUiCopy = {
  privacy: string
  recommend: string
  recommendTitle: string
  joinLiveChat: string
  liveChatHint: string
  recommendedLabel: string
  storiesLabel: string
  visitedLabel: string
  recommendedBy: string
  viewAllRecommendations: (count: string) => string
  storiesFromPlace: string
  moreStories: (count: string) => string
  comments: string
  viewAll: string
  sharePlace: string
  showQr: string
  scanToView: string
  downloadQr: string
  downloading: string
  linkCopied: string
  couldNotShare: string
  couldNotCopy: string
  couldNotShowQr: string
  couldNotDownloadQr: string
  qrDownloaded: string
  getNessaPrompt: string
  getNessa: string
  dontHaveApp: string
  openInNessa: string
  invalidPlaceTitle: string
  invalidPlaceBody: string
  placeNotFound: string
  couldNotLoadPlace: string
  tryAgain: string
  loadingPlace: string
  loading: string
  peopleInRoom: string
  livePlaceChat: string
  messagesLast24h: string
  online: string
  joinConversation: string
  enterDetails: string
  yourName: string
  namePlaceholder: string
  preferredLanguage: string
  enterChat: string
  back: string
  noSignup: string
  guestChatOn: string
  openInApp: string
  getTheApp: string
  saveChatsPrompt: string
  backToPlace: string
  send: string
  sendMessage: string
  language: string
  loadingMessages: string
  noMessagesYet: string
  messagesDisappearHint: string
  typeMessage: string
  placeIdCopied: string
  copyBlocked: string
  done: string
  noOneHereYet: string
  participants: (count: number) => string
  couldNotOpenPlaceChat: string
}

const EN: PlaceUiCopy = {
  privacy: 'Privacy',
  recommend: 'Recommend',
  recommendTitle: 'Opens this place in Nessa so you can recommend it.',
  joinLiveChat: 'Join Live Chat',
  liveChatHint: "See what's happening here now · messages last 24 hours",
  recommendedLabel: 'recommended',
  storiesLabel: 'stories',
  visitedLabel: 'visited',
  recommendedBy: 'Recommended by',
  viewAllRecommendations: count => `View all ${count} recommendations`,
  storiesFromPlace: 'Stories from this place',
  moreStories: count => `${count} more stories`,
  comments: 'Comments',
  viewAll: 'View all',
  sharePlace: 'Share place',
  showQr: 'Show QR code',
  scanToView: 'Scan to view this place on Nessa',
  downloadQr: 'Download QR',
  downloading: 'Downloading…',
  linkCopied: 'Link copied',
  couldNotShare: 'Could not share this place',
  couldNotCopy: 'Could not copy link',
  couldNotShowQr: 'Could not show QR',
  couldNotDownloadQr: 'Could not download QR',
  qrDownloaded: 'QR downloaded',
  getNessaPrompt:
    'Save your chats, follow places and discover more on Nessa',
  getNessa: 'Get Nessa',
  dontHaveApp: "Don't have the app?",
  openInNessa: 'Open in Nessa',
  invalidPlaceTitle: 'Invalid place link',
  invalidPlaceBody: "This QR or URL doesn't point to a valid Nessa place.",
  placeNotFound: 'Place not found',
  couldNotLoadPlace: "Couldn't load place",
  tryAgain: 'Please try again in a moment.',
  loadingPlace: 'Loading place…',
  loading: 'Loading…',
  peopleInRoom: 'People in this room',
  livePlaceChat: 'Live Place Chat',
  messagesLast24h: 'messages last 24 hours',
  online: 'online',
  joinConversation: 'Join the conversation',
  enterDetails: 'Enter your details to get started',
  yourName: 'Your Name',
  namePlaceholder: 'Enter your name',
  preferredLanguage: 'Preferred Language',
  enterChat: 'Enter Chat',
  back: 'Back',
  noSignup: 'No signup required. Just chat and go.',
  guestChatOn: 'Guest chat on',
  openInApp: 'Open in app',
  getTheApp: 'Get the app',
  saveChatsPrompt: 'Save your chats on Nessa',
  backToPlace: 'Back to place',
  send: 'Send',
  sendMessage: 'Send message',
  language: 'Language',
  loadingMessages: 'Loading messages…',
  noMessagesYet: 'No messages yet today. Say hello!',
  messagesDisappearHint:
    'Messages disappear after 24 hours. The room stays open.',
  typeMessage: 'Type a message…',
  placeIdCopied: 'Place ID copied',
  copyBlocked: 'Copy blocked by browser',
  done: 'Done',
  noOneHereYet: 'No one here yet.',
  participants: count => `Participants (${count})`,
  couldNotOpenPlaceChat: 'Could not open Place Chat',
}

const ES: PlaceUiCopy = {
  ...EN,
  privacy: 'Privacidad',
  recommend: 'Recomendar',
  recommendTitle: 'Abre este lugar en Nessa para recomendarlo.',
  joinLiveChat: 'Unirse al chat en vivo',
  liveChatHint: 'Mira lo que pasa ahora · mensajes durante 24 horas',
  recommendedLabel: 'recomendaciones',
  storiesLabel: 'historias',
  visitedLabel: 'visitas',
  recommendedBy: 'Recomendado por',
  viewAllRecommendations: count => `Ver las ${count} recomendaciones`,
  storiesFromPlace: 'Historias de este lugar',
  moreStories: count => `${count} historias más`,
  comments: 'Comentarios',
  viewAll: 'Ver todo',
  sharePlace: 'Compartir lugar',
  showQr: 'Mostrar código QR',
  scanToView: 'Escanea para ver este lugar en Nessa',
  downloadQr: 'Descargar QR',
  downloading: 'Descargando…',
  linkCopied: 'Enlace copiado',
  couldNotShare: 'No se pudo compartir este lugar',
  couldNotCopy: 'No se pudo copiar el enlace',
  couldNotShowQr: 'No se pudo mostrar el QR',
  couldNotDownloadQr: 'No se pudo descargar el QR',
  qrDownloaded: 'QR descargado',
  getNessaPrompt:
    'Guarda tus chats, sigue lugares y descubre más en Nessa',
  getNessa: 'Obtener Nessa',
  dontHaveApp: '¿No tienes la app?',
  openInNessa: 'Abrir en Nessa',
  invalidPlaceTitle: 'Enlace de lugar no válido',
  invalidPlaceBody: 'Este QR o URL no apunta a un lugar válido de Nessa.',
  placeNotFound: 'Lugar no encontrado',
  couldNotLoadPlace: 'No se pudo cargar el lugar',
  tryAgain: 'Inténtalo de nuevo en un momento.',
  loadingPlace: 'Cargando lugar…',
  loading: 'Cargando…',
  peopleInRoom: 'Personas en esta sala',
  livePlaceChat: 'Chat en vivo del lugar',
  messagesLast24h: 'mensajes durante 24 horas',
  online: 'en línea',
  joinConversation: 'Únete a la conversación',
  enterDetails: 'Introduce tus datos para empezar',
  yourName: 'Tu nombre',
  namePlaceholder: 'Escribe tu nombre',
  preferredLanguage: 'Idioma preferido',
  enterChat: 'Entrar al chat',
  back: 'Volver',
  noSignup: 'Sin registro. Solo chatea y listo.',
  guestChatOn: 'Chat de invitado en',
  openInApp: 'Abrir en la app',
  getTheApp: 'Obtener la app',
  saveChatsPrompt: 'Guarda tus chats en Nessa',
  backToPlace: 'Volver al lugar',
  send: 'Enviar',
  sendMessage: 'Enviar mensaje',
  language: 'Idioma',
  loadingMessages: 'Cargando mensajes…',
  noMessagesYet: 'Aún no hay mensajes hoy. ¡Di hola!',
  messagesDisappearHint:
    'Los mensajes desaparecen tras 24 horas. La sala sigue abierta.',
  typeMessage: 'Escribe un mensaje…',
  placeIdCopied: 'ID del lugar copiado',
  copyBlocked: 'El navegador bloqueó la copia',
  done: 'Listo',
  noOneHereYet: 'Aún no hay nadie.',
  participants: count => `Participantes (${count})`,
  couldNotOpenPlaceChat: 'No se pudo abrir el chat del lugar',
}

const PT: PlaceUiCopy = {
  ...EN,
  privacy: 'Privacidade',
  recommend: 'Recomendar',
  recommendTitle: 'Abre este lugar no Nessa para recomendá-lo.',
  joinLiveChat: 'Entrar no chat ao vivo',
  liveChatHint: 'Veja o que está acontecendo agora · mensagens por 24 horas',
  recommendedLabel: 'recomendações',
  storiesLabel: 'histórias',
  visitedLabel: 'visitas',
  recommendedBy: 'Recomendado por',
  viewAllRecommendations: count => `Ver todas as ${count} recomendações`,
  storiesFromPlace: 'Histórias deste lugar',
  moreStories: count => `${count} histórias a mais`,
  comments: 'Comentários',
  viewAll: 'Ver tudo',
  sharePlace: 'Compartilhar lugar',
  showQr: 'Mostrar código QR',
  scanToView: 'Escaneie para ver este lugar no Nessa',
  downloadQr: 'Baixar QR',
  downloading: 'Baixando…',
  linkCopied: 'Link copiado',
  couldNotShare: 'Não foi possível compartilhar este lugar',
  couldNotCopy: 'Não foi possível copiar o link',
  couldNotShowQr: 'Não foi possível mostrar o QR',
  couldNotDownloadQr: 'Não foi possível baixar o QR',
  qrDownloaded: 'QR baixado',
  getNessaPrompt:
    'Salve seus chats, siga lugares e descubra mais no Nessa',
  getNessa: 'Baixar Nessa',
  dontHaveApp: 'Não tem o app?',
  openInNessa: 'Abrir no Nessa',
  invalidPlaceTitle: 'Link de lugar inválido',
  invalidPlaceBody: 'Este QR ou URL não aponta para um lugar válido do Nessa.',
  placeNotFound: 'Lugar não encontrado',
  couldNotLoadPlace: 'Não foi possível carregar o lugar',
  tryAgain: 'Tente novamente em instantes.',
  loadingPlace: 'Carregando lugar…',
  loading: 'Carregando…',
  peopleInRoom: 'Pessoas nesta sala',
  livePlaceChat: 'Chat ao vivo do lugar',
  messagesLast24h: 'mensagens por 24 horas',
  online: 'online',
  joinConversation: 'Entre na conversa',
  enterDetails: 'Digite seus dados para começar',
  yourName: 'Seu nome',
  namePlaceholder: 'Digite seu nome',
  preferredLanguage: 'Idioma preferido',
  enterChat: 'Entrar no chat',
  back: 'Voltar',
  noSignup: 'Sem cadastro. É só conversar.',
  guestChatOn: 'Chat de convidado no',
  openInApp: 'Abrir no app',
  getTheApp: 'Baixar o app',
  saveChatsPrompt: 'Salve seus chats no Nessa',
  backToPlace: 'Voltar ao lugar',
  send: 'Enviar',
  sendMessage: 'Enviar mensagem',
  language: 'Idioma',
  loadingMessages: 'Carregando mensagens…',
  noMessagesYet: 'Ainda sem mensagens hoje. Diga olá!',
  messagesDisappearHint:
    'As mensagens somem após 24 horas. A sala continua aberta.',
  typeMessage: 'Digite uma mensagem…',
  placeIdCopied: 'ID do lugar copiado',
  copyBlocked: 'Cópia bloqueada pelo navegador',
  done: 'Concluído',
  noOneHereYet: 'Ninguém aqui ainda.',
  participants: count => `Participantes (${count})`,
  couldNotOpenPlaceChat: 'Não foi possível abrir o chat do lugar',
}

const FR: PlaceUiCopy = {
  ...EN,
  privacy: 'Confidentialité',
  recommend: 'Recommander',
  recommendTitle: 'Ouvre ce lieu dans Nessa pour le recommander.',
  joinLiveChat: 'Rejoindre le chat en direct',
  liveChatHint: "Voyez ce qui se passe ici · messages pendant 24 heures",
  recommendedLabel: 'recommandations',
  storiesLabel: 'stories',
  visitedLabel: 'visites',
  recommendedBy: 'Recommandé par',
  viewAllRecommendations: count => `Voir les ${count} recommandations`,
  storiesFromPlace: 'Stories de ce lieu',
  moreStories: count => `${count} stories de plus`,
  comments: 'Commentaires',
  viewAll: 'Tout voir',
  sharePlace: 'Partager le lieu',
  showQr: 'Afficher le QR',
  scanToView: 'Scannez pour voir ce lieu sur Nessa',
  downloadQr: 'Télécharger le QR',
  downloading: 'Téléchargement…',
  linkCopied: 'Lien copié',
  couldNotShare: 'Impossible de partager ce lieu',
  couldNotCopy: 'Impossible de copier le lien',
  couldNotShowQr: "Impossible d'afficher le QR",
  couldNotDownloadQr: 'Impossible de télécharger le QR',
  qrDownloaded: 'QR téléchargé',
  getNessaPrompt:
    'Enregistrez vos chats, suivez des lieux et découvrez plus sur Nessa',
  getNessa: 'Obtenir Nessa',
  dontHaveApp: "Vous n'avez pas l'app ?",
  openInNessa: 'Ouvrir dans Nessa',
  invalidPlaceTitle: 'Lien de lieu invalide',
  invalidPlaceBody: "Ce QR ou URL ne pointe pas vers un lieu Nessa valide.",
  placeNotFound: 'Lieu introuvable',
  couldNotLoadPlace: 'Impossible de charger le lieu',
  tryAgain: 'Réessayez dans un instant.',
  loadingPlace: 'Chargement du lieu…',
  loading: 'Chargement…',
  peopleInRoom: 'Personnes dans cette salle',
  livePlaceChat: 'Chat en direct du lieu',
  messagesLast24h: 'messages pendant 24 heures',
  online: 'en ligne',
  joinConversation: 'Rejoindre la conversation',
  enterDetails: 'Entrez vos infos pour commencer',
  yourName: 'Votre nom',
  namePlaceholder: 'Entrez votre nom',
  preferredLanguage: 'Langue préférée',
  enterChat: 'Entrer dans le chat',
  back: 'Retour',
  noSignup: 'Sans inscription. Discutez et partez.',
  guestChatOn: 'Chat invité sur',
  openInApp: "Ouvrir dans l'app",
  getTheApp: "Obtenir l'app",
  saveChatsPrompt: 'Enregistrez vos chats sur Nessa',
  backToPlace: 'Retour au lieu',
  send: 'Envoyer',
  sendMessage: 'Envoyer le message',
  language: 'Langue',
  loadingMessages: 'Chargement des messages…',
  noMessagesYet: "Pas encore de messages aujourd'hui. Dites bonjour !",
  messagesDisappearHint:
    'Les messages disparaissent après 24 heures. La salle reste ouverte.',
  typeMessage: 'Écrivez un message…',
  placeIdCopied: 'ID du lieu copié',
  copyBlocked: 'Copie bloquée par le navigateur',
  done: 'Terminé',
  noOneHereYet: 'Personne ici pour le moment.',
  participants: count => `Participants (${count})`,
  couldNotOpenPlaceChat: "Impossible d'ouvrir le chat du lieu",
}

const DE: PlaceUiCopy = {
  ...EN,
  privacy: 'Datenschutz',
  recommend: 'Empfehlen',
  recommendTitle: 'Öffnet diesen Ort in Nessa zum Empfehlen.',
  joinLiveChat: 'Live-Chat beitreten',
  liveChatHint: 'Sieh, was gerade passiert · Nachrichten 24 Stunden',
  recommendedLabel: 'Empfehlungen',
  storiesLabel: 'Stories',
  visitedLabel: 'Besuche',
  recommendedBy: 'Empfohlen von',
  viewAllRecommendations: count => `Alle ${count} Empfehlungen ansehen`,
  storiesFromPlace: 'Stories von diesem Ort',
  moreStories: count => `${count} weitere Stories`,
  comments: 'Kommentare',
  viewAll: 'Alle ansehen',
  sharePlace: 'Ort teilen',
  showQr: 'QR-Code zeigen',
  scanToView: 'Scannen, um diesen Ort auf Nessa zu sehen',
  downloadQr: 'QR herunterladen',
  downloading: 'Wird heruntergeladen…',
  linkCopied: 'Link kopiert',
  couldNotShare: 'Ort konnte nicht geteilt werden',
  couldNotCopy: 'Link konnte nicht kopiert werden',
  couldNotShowQr: 'QR konnte nicht angezeigt werden',
  couldNotDownloadQr: 'QR konnte nicht heruntergeladen werden',
  qrDownloaded: 'QR heruntergeladen',
  getNessaPrompt:
    'Speichere Chats, folge Orten und entdecke mehr auf Nessa',
  getNessa: 'Nessa holen',
  dontHaveApp: 'Noch keine App?',
  openInNessa: 'In Nessa öffnen',
  invalidPlaceTitle: 'Ungültiger Ort-Link',
  invalidPlaceBody: 'Dieser QR oder URL führt zu keinem gültigen Nessa-Ort.',
  placeNotFound: 'Ort nicht gefunden',
  couldNotLoadPlace: 'Ort konnte nicht geladen werden',
  tryAgain: 'Bitte versuche es gleich noch einmal.',
  loadingPlace: 'Ort wird geladen…',
  loading: 'Wird geladen…',
  peopleInRoom: 'Personen in diesem Raum',
  livePlaceChat: 'Live-Ort-Chat',
  messagesLast24h: 'Nachrichten 24 Stunden',
  online: 'online',
  joinConversation: 'Tritt dem Gespräch bei',
  enterDetails: 'Gib deine Daten ein, um zu starten',
  yourName: 'Dein Name',
  namePlaceholder: 'Namen eingeben',
  preferredLanguage: 'Bevorzugte Sprache',
  enterChat: 'Chat betreten',
  back: 'Zurück',
  noSignup: 'Keine Anmeldung. Einfach chatten.',
  guestChatOn: 'Gast-Chat auf',
  openInApp: 'In der App öffnen',
  getTheApp: 'App holen',
  saveChatsPrompt: 'Speichere deine Chats auf Nessa',
  backToPlace: 'Zurück zum Ort',
  send: 'Senden',
  sendMessage: 'Nachricht senden',
  language: 'Sprache',
  loadingMessages: 'Nachrichten werden geladen…',
  noMessagesYet: 'Heute noch keine Nachrichten. Sag hallo!',
  messagesDisappearHint:
    'Nachrichten verschwinden nach 24 Stunden. Der Raum bleibt offen.',
  typeMessage: 'Nachricht schreiben…',
  placeIdCopied: 'Ort-ID kopiert',
  copyBlocked: 'Kopieren vom Browser blockiert',
  done: 'Fertig',
  noOneHereYet: 'Noch niemand hier.',
  participants: count => `Teilnehmer (${count})`,
  couldNotOpenPlaceChat: 'Ort-Chat konnte nicht geöffnet werden',
}

const BY_LANG: Record<string, PlaceUiCopy> = {
  en: EN,
  es: ES,
  pt: PT,
  fr: FR,
  de: DE,
}

export function getPlaceUiCopy(language: string | null | undefined): PlaceUiCopy {
  const code = resolveAppLanguageCode(language || DEFAULT_CHAT_LANGUAGE_CODE)
  return BY_LANG[code] ?? EN
}
