import type { LanguageCode } from './translations';

type SettingsCopy = {
  title: string;
  subtitle: string;
  back: string;
  productInformation: string;
  version: string;
  build: string;
  publisher: string;
  publishedBy: string;
  faq: string;
  faqItems: Array<{ question: string; answer: string }>;
  informationAndSupport: string;
  privacy: string;
  terms: string;
  aiDisclosure: string;
  support: string;
  pilotNotice: string;
};

export const SETTINGS_COPY: Record<LanguageCode, SettingsCopy> = {
  en: {
    title: 'Settings', subtitle: 'About Tudela Global and help using your tour', back: 'Back',
    productInformation: 'Product information', version: 'Version', build: 'Build', publisher: 'Publisher',
    publishedBy: 'Published by Tudela Global', faq: 'Frequently asked questions',
    informationAndSupport: 'Legal, privacy and support', privacy: 'Privacy notice', terms: 'Public pilot terms', aiDisclosure: 'Ask Benjamin AI disclosure', support: 'Support',
    faqItems: [
      { question: 'How do I start a tour?', answer: 'Open Discover, choose a city and tour, then tap Start this stop on stop 1.' },
      { question: 'What does Location ready mean?', answer: 'With your permission, Tudela uses your phone location to show where you are, guide you to the next stop and detect when you arrive. The number shown is the approximate accuracy.' },
      { question: 'What is the difference between Tudela’s map, Google Maps and Waze?', answer: 'Tudela keeps the tour, stop order, audio and arrival status together. Google Maps and Waze open turn-by-turn directions. Your phone supplies your location.' },
      { question: 'How do arrival controls work?', answer: 'Open Settings to choose automatic or manual narration. You can also turn the arrival tone, vibration and screen pulse on or off separately. Tudela records arrival only when Location is on and your phone detects the stop.' },
      { question: 'Where do I change Location and alerts?', answer: 'Use the Settings cog at the top of the screen. Location can also be switched on or off from the header or Live Walk. Distance appears only while Location is on.' },
      { question: 'What is the Saved page for?', answer: 'Saved contains only complete tours you have bookmarked. Connection and synchronization information is in Settings.' },
      { question: 'How do I get help with a tour?', answer: 'During the pilot, contact the organization that shared the tour. Include the city, tour name and stop when reporting a problem.' },
    ],
    pilotNotice: 'Public pilot build. Features and content may change after testing.',
  },
  he: {
    title: 'הגדרות', subtitle: 'מידע על Tudela Global ועזרה בשימוש בסיור', back: 'חזרה',
    productInformation: 'מידע על המוצר', version: 'גרסה', build: 'מספר בנייה', publisher: 'מפרסם',
    publishedBy: 'פורסם על ידי Tudela Global', faq: 'שאלות נפוצות',
    informationAndSupport: 'משפטי, פרטיות ותמיכה', privacy: 'הודעת פרטיות', terms: 'תנאי הפיילוט הציבורי', aiDisclosure: 'גילוי נאות על Ask Benjamin', support: 'תמיכה',
    faqItems: [
      { question: 'איך מתחילים סיור?', answer: 'פתחו את מסך הגילוי, בחרו עיר, בחרו סיור כאשר יש יותר מאפשרות אחת ולחצו על התחלה בתחנה הראשונה.' },
      { question: 'מה פירוש ״המיקום מוכן״?', answer: 'באישורכם, Tudela משתמשת במיקום הטלפון כדי להציג היכן אתם, להוביל לתחנה הבאה ולזהות הגעה. המספר מציג את הדיוק המשוער.' },
      { question: 'מה ההבדל בין מפת Tudela, ‏Google Maps ו-Waze?', answer: 'Tudela שומרת יחד את הסיור, סדר התחנות, הקריינות ומצב ההגעה. Google Maps מספק ניווט הליכה ונתוני מסלול כשהשירות מוגדר; Waze הוא קישור חיצוני אופציונלי. מיקום המכשיר מספק את המיקום החי.' },
      { question: 'איך פועלת קריינות אוטומטית בהגעה?', answer: 'במסלול חי הפעילו קריינות אוטומטית בהגעה. כאשר ה-GPS החי נכנס לאזור התחנה, Tudela מהבהבת, מנסה להשמיע צליל ולרטוט ומפעילה את הקריינות המאושרת. ייתכן שהטלפון ידרוש נגיעה קודמת להפעלת קול.' },
      { question: 'היכן משנים מיקום והתראות הגעה?', answer: 'פתחו את גלגל השיניים של ההגדרות. שם אפשר לבחור הפעלה אוטומטית או ידנית ולשנות צליל, רטט והבהוב בנפרד.' },
      { question: 'איך מקבלים עזרה בסיור?', answer: 'במהלך הפיילוט פנו לארגון ששיתף את הסיור. ציינו את העיר, שם הסיור והתחנה בעת דיווח על בעיה.' },
    ],
    pilotNotice: 'גרסת פיילוט ציבורי. תכונות ותוכן עשויים להשתנות לאחר הבדיקות.',
  },
  ru: {
    title: 'Настройки', subtitle: 'О Tudela Global и помощь по использованию экскурсии', back: 'Назад',
    productInformation: 'Информация о продукте', version: 'Версия', build: 'Сборка', publisher: 'Издатель',
    publishedBy: 'Опубликовано Tudela Global', faq: 'Часто задаваемые вопросы',
    informationAndSupport: 'Право, приватность и поддержка', privacy: 'Конфиденциальность', terms: 'Условия пилота', aiDisclosure: 'Раскрытие об Ask Benjamin', support: 'Поддержка',
    faqItems: [
      { question: 'Как начать экскурсию?', answer: 'Откройте раздел «Каталог», выберите город, затем экскурсию, если их несколько, и нажмите «Начать» у первой остановки.' },
      { question: 'Что означает «Местоположение готово»?', answer: 'С вашего разрешения Tudela использует местоположение телефона, чтобы показать вас на карте, провести к следующей остановке и определить прибытие. Число показывает примерную точность.' },
      { question: 'Чем отличаются карта Tudela, Google Maps и Waze?', answer: 'Tudela объединяет экскурсию, порядок остановок, аудио и статус прибытия. Google Maps открывает пешую навигацию и даёт маршрут при настройке сервиса; Waze — дополнительный внешний переход. Текущее положение поступает от GPS устройства.' },
      { question: 'Как работает автоматическое аудио по прибытии?', answer: 'В Live Walk включите автоматическое аудио. При входе GPS в зону остановки Tudela мигает, пытается подать звуковой и вибросигнал и запускает проверенную запись. Телефону может потребоваться предварительное нажатие для разрешения звука.' },
      { question: 'Можно ли использовать сохранённое без интернета?', answer: 'Сохранённые остановки и заметки доступны на этом устройстве. Ожидающие изменения синхронизируются после восстановления соединения.' },
      { question: 'Как получить помощь по экскурсии?', answer: 'Во время пилота свяжитесь с организацией, которая поделилась экскурсией. Укажите город, название экскурсии и остановку.' },
    ],
    pilotNotice: 'Версия публичного пилота. Функции и материалы могут измениться после тестирования.',
  },
  fr: {
    title: 'Réglages', subtitle: 'À propos de Tudela Global et aide pour votre visite', back: 'Retour',
    productInformation: 'Informations sur le produit', version: 'Version', build: 'Build', publisher: 'Éditeur',
    publishedBy: 'Publié par Tudela Global', faq: 'Questions fréquentes',
    informationAndSupport: 'Juridique, confidentialité et assistance', privacy: 'Avis de confidentialité', terms: 'Conditions du pilote', aiDisclosure: 'Information sur Ask Benjamin', support: 'Assistance',
    faqItems: [
      { question: 'Comment démarrer une visite ?', answer: 'Ouvrez Découvrir, choisissez une ville, sélectionnez une visite lorsqu’il y en a plusieurs, puis touchez Démarrer à la première étape.' },
      { question: 'Que signifie « Position prête » ?', answer: 'Avec votre autorisation, Tudela utilise la position du téléphone pour vous situer, vous guider vers l’étape suivante et détecter votre arrivée. Le nombre indique la précision approximative.' },
      { question: 'Quelle différence entre la carte Tudela, Google Maps et Waze ?', answer: 'Tudela réunit la visite, l’ordre des étapes, l’audio et l’arrivée. Google Maps et Waze ouvrent les indications détaillées. Votre téléphone fournit votre position.' },
      { question: 'Comment fonctionne l’audio automatique à l’arrivée ?', answer: 'Dans Live Walk, activez l’audio automatique. Lorsque le GPS entre dans la zone d’une étape, Tudela clignote, tente une tonalité et une vibration, puis lance la narration validée. Le téléphone peut exiger un premier toucher pour autoriser le son.' },
      { question: 'Où régler la localisation et les alertes ?', answer: 'Ouvrez la roue dentée Réglages. Choisissez le démarrage automatique ou manuel et activez séparément le son, la vibration et le flash de l’écran.' },
      { question: 'Comment obtenir de l’aide pour une visite ?', answer: 'Pendant le pilote, contactez l’organisation qui a partagé la visite. Indiquez la ville, le nom de la visite et l’étape concernée.' },
    ],
    pilotNotice: 'Version pilote publique. Les fonctions et le contenu peuvent évoluer après les tests.',
  },
  de: {
    title: 'Einstellungen', subtitle: 'Über Tudela Global und Hilfe zu Ihrer Tour', back: 'Zurück',
    productInformation: 'Produktinformationen', version: 'Version', build: 'Build', publisher: 'Herausgeber',
    publishedBy: 'Veröffentlicht von Tudela Global', faq: 'Häufig gestellte Fragen',
    informationAndSupport: 'Recht, Datenschutz und Support', privacy: 'Datenschutzhinweis', terms: 'Bedingungen des Piloten', aiDisclosure: 'KI-Hinweis zu Ask Benjamin', support: 'Support',
    faqItems: [
      { question: 'Wie starte ich eine Tour?', answer: 'Öffnen Sie Entdecken, wählen Sie eine Stadt und bei mehreren Angeboten eine Tour. Tippen Sie beim ersten Stopp auf Start.' },
      { question: 'Wie funktioniert Live-GPS?', answer: 'Mit Ihrer Erlaubnis nutzt der Rundgang den Gerätestandort, um Ihre Position und nahe Stopps anzuzeigen. Die Genauigkeit hängt von Gerät und Umgebung ab.' },
      { question: 'Was ist der Unterschied zwischen Tudela-Karte, Google Maps und Waze?', answer: 'Tudela hält Tour, Reihenfolge, Audio und Ankunft zusammen. Google Maps öffnet die Fußgängernavigation und liefert bei Konfiguration die Route; Waze ist eine optionale externe Übergabe. Das Geräte-GPS liefert Ihre aktuelle Position.' },
      { question: 'Wie funktioniert automatisches Audio bei Ankunft?', answer: 'Aktivieren Sie in Live Walk das automatische Ankunftsaudio. Beim Eintritt in den GPS-Bereich blinkt Tudela, versucht Ton und Vibration und startet die geprüfte Aufnahme. Das Telefon kann zuvor eine Berührung zur Tonfreigabe verlangen.' },
      { question: 'Kann ich gespeicherte Inhalte offline verwenden?', answer: 'Gespeicherte Stopps und Notizen bleiben auf diesem Gerät verfügbar. Ausstehende Änderungen werden nach Wiederherstellung der Verbindung synchronisiert.' },
      { question: 'Wie erhalte ich Hilfe zu einer Tour?', answer: 'Wenden Sie sich während des Piloten an die Organisation, die die Tour geteilt hat. Nennen Sie Stadt, Tour und betroffenen Stopp.' },
    ],
    pilotNotice: 'Öffentliche Pilotversion. Funktionen und Inhalte können sich nach Tests ändern.',
  },
  es: {
    title: 'Ajustes', subtitle: 'Acerca de Tudela Global y ayuda para usar el tour', back: 'Volver',
    productInformation: 'Información del producto', version: 'Versión', build: 'Compilación', publisher: 'Editor',
    publishedBy: 'Publicado por Tudela Global', faq: 'Preguntas frecuentes',
    informationAndSupport: 'Legal, privacidad y soporte', privacy: 'Aviso de privacidad', terms: 'Términos del piloto', aiDisclosure: 'Divulgación de Ask Benjamin', support: 'Soporte',
    faqItems: [
      { question: '¿Cómo inicio un tour?', answer: 'Abre Descubrir, selecciona una ciudad, elige un tour si hay varios y pulsa Comenzar en la primera parada.' },
      { question: '¿Cómo funciona el GPS en directo?', answer: 'Con tu permiso, el recorrido utiliza la ubicación del dispositivo para mostrar dónde estás e identificar paradas cercanas. La precisión varía según el dispositivo y el entorno.' },
      { question: '¿Qué diferencia hay entre el mapa de Tudela, Google Maps y Waze?', answer: 'Tudela mantiene juntos el tour, el orden, la narración y la llegada. Google Maps abre la navegación a pie y aporta la ruta cuando está configurado; Waze es una transferencia externa opcional. El GPS del dispositivo proporciona la posición.' },
      { question: '¿Cómo funciona el audio automático al llegar?', answer: 'En Live Walk activa el audio automático. Al entrar el GPS en la zona de una parada, Tudela parpadea, intenta emitir tono y vibración e inicia la narración revisada. El teléfono puede exigir un toque previo para permitir sonido.' },
      { question: '¿Puedo usar el contenido guardado sin conexión?', answer: 'Las paradas y notas guardadas permanecen disponibles en este dispositivo. Los cambios pendientes se sincronizan cuando vuelve la conexión.' },
      { question: '¿Cómo obtengo ayuda con un tour?', answer: 'Durante el piloto, contacta con la organización que compartió el tour. Indica la ciudad, el nombre del tour y la parada afectada.' },
    ],
    pilotNotice: 'Versión piloto pública. Las funciones y el contenido pueden cambiar después de las pruebas.',
  },
};
