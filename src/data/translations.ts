import { HeritageSite, TourCity, SiteCategory } from '../types';
import { FRENCH_CATEGORY_NAMES, FRENCH_CITY_TRANSLATIONS, FRENCH_SITE_TRANSLATIONS, FRENCH_UI_TRANSLATIONS } from './frenchTranslations';
import { SUPPLEMENTAL_SITE_TRANSLATIONS } from './supplementalTranslations';
import { SAVED_PANEL_UI_TRANSLATIONS } from './savedPanelTranslations';
import { GERMAN_CATEGORY_NAMES, GERMAN_UI_TRANSLATIONS, SPANISH_CATEGORY_NAMES, SPANISH_UI_TRANSLATIONS } from './germanSpanishTranslations';
import { TOUR_CONTROL_UI_TRANSLATIONS } from './tourControlTranslations';
import { FRENCH_CATEGORY_SUPPLEMENTS, LEGACY_CORE_UI_SUPPLEMENTS } from './legacyTranslationSupplements';
import { DISCOVERY_TOUR_UI_TRANSLATIONS } from './discoveryTourTranslations';

export type LanguageCode = 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  initials: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', initials: 'GB', flag: '🇬🇧', dir: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', initials: 'IL', flag: '🇮🇱', dir: 'rtl' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', initials: 'RU', flag: '🇷🇺', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', initials: 'FR', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', initials: 'DE', flag: '🇩🇪', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', initials: 'ES', flag: '🇪🇸', dir: 'ltr' },
];

export const CATEGORY_NAMES: Partial<Record<LanguageCode, Record<string, string>>> & { en: Record<string, string> } = {
  en: {
    all: 'Interests',
    synagogue: 'Synagogues',
    museum: 'Jewish Museums',
    kosher_food: 'Kosher Food',
    community: 'Community & Chabad',
    education: 'Schools & Yeshivas',
    juderia: 'Heritage Sites',
    scholar: 'Zionism',
    holocaust: 'Holocaust',
    legends: 'Legends',
    personalities: 'Personalities',
    historic_sites: 'Historic Sites',
    monument: 'Memorials',
    cemetery: 'Cemeteries',
    mikveh: 'Mikveh & Rituals',
    archaeology: 'Archaeological Sites',
    archives: 'Archives & Libraries',
    bridge: 'Historic Bridges',
    historic_site: 'Historic Sites',
    memorial: 'Memorials',
    culture: 'Jewish Culture',
  },
  he: {
    holocaust: 'שואה',
    legends: 'אגדות',
    personalities: 'אישים',
    historic_sites: 'אתרים היסטוריים',
    all: 'תחומי עניין',
    synagogue: 'בתי כנסת',
    museum: 'מוזיאונים יהודיים',
    kosher_food: 'אוכל כשר',
    community: 'קהילה ובתי חב״ד',
    education: 'בתי ספר וישיבות',
    juderia: 'אתרי מורשת',
    scholar: 'מנהיגים וציונות',
    monument: 'אנדרטאות',
    cemetery: 'בתי עלמין',
    mikveh: 'מקוואות ופולחן',
    archaeology: 'אתרים ארכאולוגיים',
    archives: 'ארכיונים וספריות',
    bridge: 'גשרים היסטוריים',
    historic_site: 'אתרים היסטוריים',
    memorial: 'אתרי זיכרון',
    culture: 'תרבות יהודית',
  },
  ru: {
    holocaust: 'Холокост',
    legends: 'Легенды',
    personalities: 'Личности',
    historic_sites: 'Исторические места',
    all: 'Интересы',
    synagogue: 'Синагоги',
    museum: 'Еврейские музеи',
    kosher_food: 'Кошерная еда',
    community: 'Общины и Хабад',
    education: 'Школы и ешивы',
    juderia: 'Объекты наследия',
    scholar: 'Деятели и сионизм',
    monument: 'Мемориалы',
    cemetery: 'Кладбища',
    mikveh: 'Миквы и обряды',
    archaeology: 'Археологические места',
    archives: 'Архивы и библиотеки',
    bridge: 'Исторические мосты',
    historic_site: 'Исторические места',
    memorial: 'Мемориалы',
    culture: 'Еврейская культура',
  },
  fr: { ...FRENCH_CATEGORY_NAMES, ...FRENCH_CATEGORY_SUPPLEMENTS },
  de: GERMAN_CATEGORY_NAMES,
  es: SPANISH_CATEGORY_NAMES,
};

export const UI_TRANSLATIONS: Partial<Record<LanguageCode, Record<string, string>>> & { en: Record<string, string> } = {
  en: {
    ...DISCOVERY_TOUR_UI_TRANSLATIONS.en,
    // Navigation
    navLiveWalk: 'Live Walk',
    navDiscover: 'Discover',
    navSaved: 'Saved',
    navAskHerzl: 'Ask Herzl AI',
    navAskBenjamin: 'Ask Benjamin',
    navSettings: 'Settings',
    discoverTitle: 'Global Jewish Heritage',
    selectCity: 'Select City',
    recommendedCities: 'Recommended Cities',
    selectDestination: 'Select destination',

    // Header & Top Controls
    selectTour: 'Select Audio Tour',
    selectLanguage: 'Language / שפה / Языק',
    autoGps: 'AUTO GPS',
    off: 'OFF',
    stops: 'stops',
    cloudSynced: 'Saved and up to date',
    offlineMode: 'Offline Mode',

    // Live Walk Map
    nearestStop: 'Nearest Stop',
    play: 'Play',
    startAudioGuide: 'Start Audio Guide',
    transcript: 'Read along',
    googleMaps: 'Google Maps',
    recenterMap: 'Recenter Map',
    mapImagery: 'Map Imagery',
    tourProgress: 'Tour Progress',
    savedSites: 'Saved Sites',

    // Discover & Search
    searchPlaceholder: 'Search country, city, tour or landmark...',
    allCategories: 'Interests',
    start: 'Start this stop',
    replayAudio: 'Replay Audio',
    resumeAudio: 'Resume Audio',
    noSitesFound: 'No heritage sites match your filter',
    nearMe: 'Near Me',
    found: 'Found',
    heritageSites: 'heritage sites',
    map: 'Tour map',
    batteryStatus: 'Battery',
    batteryCharging: 'Battery charging',
    batteryUnavailable: 'Battery status unavailable',
    batteryLowWarning: 'Low battery may interrupt tour audio',
    saveSite: 'Save site',
    saved: 'Saved',
    away: 'away',

    // Herzl AI Bot
    askHerzlTitle: 'Asked Herzl',
    askHerzlSubtitle: 'Visionary of Zionism AI',
    askBenjaminTitle: 'Ask Benjamin',
    askBenjaminSubtitle: 'AI heritage sage',
    tourLabel: 'Tour:',
    suggestedQuestions: 'Suggested Questions',
    chatPlaceholder: 'Ask Benjamin about synagogues, Zionism, heritage...',
    send: 'Send',
    shalomGreeting: "Shalom U'vrakha! (שלום וברכה)",
    botIntroText: 'I am Benjamin, your AI-assisted Jewish heritage guide. Ask me about the published places and stories on this route.',
    closeChat: 'Close Chat',

    // Player Drawer
    nowPlaying: 'Now Playing',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',

    // Offline & Notifications
    offlinePanelTitle: 'Offline Storage & GPS Settings',
    savedBookmarks: 'Saved Bookmarks',
    notifications: 'Notifications',
    close: 'Close',
  },
  he: {
    ...DISCOVERY_TOUR_UI_TRANSLATIONS.he,
    ...LEGACY_CORE_UI_SUPPLEMENTS.he,
    // Navigation
    navLiveWalk: 'מפת ניווט',
    navDiscover: 'גלה אתרים',
    navSaved: 'שמורים',
    navAskHerzl: 'שאלו את בנימין',
    navAskBenjamin: 'שאלו את בנימין',
    navSettings: 'הגדרות',

    // Header & Top Controls
    selectTour: 'בחר סיור קולי',
    selectLanguage: 'שפה / Language',
    autoGps: 'GPS אוטומטי',
    off: 'כבוי',
    stops: 'תחנות',
    cloudSynced: 'נשמר ומעודכן',
    offlineMode: 'מצב אופליין',

    // Live Walk Map
    nearestStop: 'התחנה הקרובה',
    play: 'הפעל',
    startAudioGuide: 'התחל הדרכה קולית',
    transcript: 'תמליל היסטורי',
    googleMaps: 'ניווט בגוגל מפות',
    recenterMap: 'מרכז מפה',
    mapImagery: 'סגנון מפה',
    tourProgress: 'התקדמות בסיור',
    savedSites: 'אתרים שמורים',

    // Discover & Search
    searchPlaceholder: 'חיפוש לפי מדינה, עיר, סיור או אתר...',
    allCategories: 'כל הקטגוריות',
    start: 'התחל',
    replayAudio: 'הפעל מחדש',
    resumeAudio: 'המשך הדרכה',
    noSitesFound: 'לא נמצאו אתרי מורשת לפי הסינון',
    nearMe: 'קרוב אליי',
    found: 'נמצאו',
    heritageSites: 'אתרי מורשת',
    map: 'מפה',
    batteryStatus: 'סוללה',
    batteryCharging: 'הסוללה נטענת',
    batteryUnavailable: 'מצב הסוללה אינו זמין',
    batteryLowWarning: 'סוללה חלשה עלולה להפסיק את השמע בסיור',
    saveSite: 'שמור אתר',
    saved: 'שמור',
    away: 'מכאן',

    // Herzl AI Bot
    askHerzlTitle: 'תאודור הרצל',
    askHerzlSubtitle: 'חוזה מדינת היהודים (בינה מלאכותית)',
    askBenjaminTitle: 'שאלו את בנימין',
    askBenjaminSubtitle: 'חכם מורשת מבוסס בינה מלאכותית',
    tourLabel: 'סיור:',
    suggestedQuestions: 'שאלות מומלצות',
    chatPlaceholder: 'שאלו את בנימין על בתי כנסת, ציונות ומורשת...',
    send: 'שלח',
    shalomGreeting: 'שלום וברכה!',
    botIntroText: 'אני בנימין, מדריך מורשת יהודית מבוסס בינה מלאכותית. אפשר לשאול אותי על המקומות והסיפורים שפורסמו בסיור זה.',
    closeChat: 'סגור צ׳אט',

    // Player Drawer
    nowPlaying: 'מופעל כעת',
    pause: 'השהה',
    resume: 'המשך',
    stop: 'עצור',

    // Offline & Notifications
    offlinePanelTitle: 'הגדרות אופליין ו-GPS',
    savedBookmarks: 'אתרים שמורים',
    notifications: 'התראות',
    close: 'סגור',
  },
  ru: {
    ...DISCOVERY_TOUR_UI_TRANSLATIONS.ru,
    ...LEGACY_CORE_UI_SUPPLEMENTS.ru,
    // Navigation
    navLiveWalk: 'Маршрут Live',
    navDiscover: 'Каталог',
    navSaved: 'Закладки',
    navAskHerzl: 'Спросить Беньямина',
    navAskBenjamin: 'Спросить Беньямина',
    navSettings: 'Настройки',

    // Header & Top Controls
    selectTour: 'Выберите аудиотур',
    selectLanguage: 'Язык / Language',
    autoGps: 'Авто GPS',
    off: 'ВЫКЛ',
    stops: 'остановок',
    cloudSynced: 'Сохранено и обновлено',
    offlineMode: 'Офлайн режим',

    // Live Walk Map
    nearestStop: 'Ближайшая остановка',
    play: 'Слушать',
    startAudioGuide: 'Начать аудиогид',
    transcript: 'Текст гида',
    googleMaps: 'Google Карты',
    recenterMap: 'Центрировать',
    mapImagery: 'Стиль карты',
    tourProgress: 'Прогресс тура',
    savedSites: 'Сохраненные места',

    // Discover & Search
    searchPlaceholder: 'Поиск по стране, городу, туру или месту...',
    allCategories: 'Все категории',
    start: 'Начать',
    replayAudio: 'Повторить',
    resumeAudio: 'Продолжить',
    noSitesFound: 'Не найдено объектов по вашему запросу',
    nearMe: 'Рядом со мной',
    found: 'Найдено',
    heritageSites: 'объектов наследия',
    map: 'Карта',
    batteryStatus: 'Батарея',
    batteryCharging: 'Батарея заряжается',
    batteryUnavailable: 'Состояние батареи недоступно',
    batteryLowWarning: 'Низкий заряд может прервать аудиогид',
    saveSite: 'Сохранить',
    saved: 'Сохранено',
    away: 'от вас',

    // Herzl AI Bot
    askHerzlTitle: 'Теодор Герцль',
    askHerzlSubtitle: 'Провидец Еврейского Государства (ИИ)',
    askBenjaminTitle: 'Спросить Беньямина',
    askBenjaminSubtitle: 'ИИ-гид по еврейскому наследию',
    tourLabel: 'Тур:',
    suggestedQuestions: 'Рекомендуемые вопросы',
    chatPlaceholder: 'Спросите Беньямина о синагогах, сионизме и наследии...',
    send: 'Отправить',
    shalomGreeting: 'Шалом Увраха! (שלום וברכה)',
    botIntroText: 'Я Беньямин, ваш ИИ-гид по еврейскому наследию. Спросите меня об опубликованных местах и историях этого маршрута.',
    closeChat: 'Закрыть чат',

    // Player Drawer
    nowPlaying: 'Сейчас играет',
    pause: 'Пауза',
    resume: 'Продолжить',
    stop: 'Стоп',

    // Offline & Notifications
    offlinePanelTitle: 'Настройки офлайн и GPS',
    savedBookmarks: 'Сохраненные места',
    notifications: 'Уведомления',
    close: 'Закрыть',
  },
  fr: { ...FRENCH_UI_TRANSLATIONS, ...LEGACY_CORE_UI_SUPPLEMENTS.fr, ...DISCOVERY_TOUR_UI_TRANSLATIONS.fr },
  de: { ...GERMAN_UI_TRANSLATIONS, ...DISCOVERY_TOUR_UI_TRANSLATIONS.de },
  es: { ...SPANISH_UI_TRANSLATIONS, ...DISCOVERY_TOUR_UI_TRANSLATIONS.es },
};

// Site Translations
export const SITE_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, { name: string; shortDescription: string; transcript: string; categoryName?: string }>>> = {
  'budapest-dohany-synagogue': {
    en: {
      name: 'Dohány Street Synagogue (The Great Synagogue)',
      shortDescription: 'The largest synagogue in Europe and second-largest in the world, a masterpiece of Moorish Revival architecture.',
      transcript: `Shalom and welcome to the majestic Dohány Street Synagogue, the beating heart of Hungarian Jewish history and the largest synagogue sanctuary in all of Europe. Built between 1854 and 1859 in stunning Moorish Revival style, its twin octagonal towers symbolize Solomon's Temple. During WWII it formed the border of the Budapest Ghetto. Today it stands restored as a thriving center of Jewish prayer and heritage.`,
    },
    he: {
      name: 'בית הכנסת הגדול של בודפשט (רחוב דוהאני)',
      shortDescription: 'בית הכנסת הגדול ביותר באירופה והשני בגודלו בעולם, יצירת מופת בסגנון נאו-מורי.',
      transcript: `שלום וברוכים הבאים לבית הכנסת הגדול ברחוב דוהאני בבודפשט, הלב הפועם של יהדות הונגריה ובית הכנסת הגדול באירופה. המבנה המפואר נבנה בין השנים 1854 ל-1859 בסגנון נאו-מורי מרהיב, עם שני מגדלים מתומנים המזכירים את עמודי יכין ובועז בבית המקדש. בתקופת השואה שימש מתחם בית הכנסת כחלק מגבול גטו בודפשט. כיום זהו מרכז תפילה, תרבות ומורשת פעיל ותוסס.`,
    },
    ru: {
      name: 'Синагога на улице Дохань (Большая синагога)',
      shortDescription: 'Крупнейшая синагога в Европе и вторая по величине в мире, шедевр неомавританского стиля.',
      transcript: `Шалом и добро пожаловать в Большую синагогу на улице Дохань — сердце еврейской истории Будапешта. Построенная в 1854–1859 годах в неомавританском стиле, она вмещает более 3000 молящихся. В годы Второй мировой войны территория синагоги входила в Будапештское гетто. Сегодня это действующий центр еврейской общины и культуры.`,
    },
  },
  'budapest-herzl-birthplace': {
    en: {
      name: 'Theodor Herzl Birthplace & Jewish Museum',
      shortDescription: 'The exact birthplace of Theodor Herzl, father of modern political Zionism and visionary of the State of Israel.',
      transcript: `You are standing at the birthplace of Theodor Herzl, born May 2, 1860. Here young Herzl grew up adjacent to the Great Synagogue before publishing "Der Judenstaat" in 1896 and convening the First Zionist Congress in Basel in 1897. Fifty years later, the State of Israel was born.`,
    },
    he: {
      name: 'מקום הולדתו של בנימין זאב הרצל (המוזיאון היהודי)',
      shortDescription: 'מקום הולדתו המדויק של בנימין זאב הרצל, חוזה מדינת ישראל ואבי הציונות המדינית.',
      transcript: `אתם עומדים במקום הולדתו המדויק של בנימין זאב הרצל, שנולד כאן ב-2 במאי 1860. בבית זה גדל הרצל הצעיר בצמוד לבית הכנסת הגדול. בשנת 1896 פרסם את ספרו הפורץ דרך "מדינת היהודים" וב-1897 כינס את הקונגרס הציוני הראשון בבאזל, שם כתב: "בבאזל יסדתי את מדינת היהודים". כעבור 50 שנה הוקמה מדינת ישראל.`,
    },
    ru: {
      name: 'Дом рождения Теодора Герцля и Еврейский музей',
      shortDescription: 'Место рождения Теодора Герцля, отца политического сионизма и провидца Государства Израиль.',
      transcript: `Вы стоите на месте рождения Теодора Герцля, родившегося 2 мая 1860 года. В 1896 году он опубликовал «Еврейское государство», а в 1897 собрал Первый сионистский конгресс. Ровно через 50 лет родилось Государство Израиль.`,
    },
  },
  'budapest-wallenberg-park': {
    en: {
      name: 'Emanuel Tree of Life Memorial',
      shortDescription: 'A striking weeping willow sculpture crafted in silver and granite in memory of Hungarian Holocaust victims.',
      transcript: `Designed by Imre Varga, this silver weeping willow leaves bear the names of over 600,000 Hungarian Jews murdered during the Holocaust. Sponsored by the Emanuel Foundation and actor Tony Curtis in memory of his father Emanuel Schwartz.`,
    },
    he: {
      name: 'אנדרטת עץ החיים (עמנואל)',
      shortDescription: 'פסל ערבה בוכייה מרהיב מכסף וגרניט לזכר קרבנות השואה בהונגריה.',
      transcript: `פסל עץ הערבה הבוכייה מכסף, שנוצר על ידי האמן אימרה ורגה, נושא על עליו את שמותיהם של מאות אלפי יהודי הונגריה שנרצחו בשואה. הוקם ביוזמת קרן עמנואל והשחקן טוני קורטיס לזכר אביו עמנואל שוורץ.`,
    },
    ru: {
      name: 'Мемориал «Древо жизни» (Эмануэль)',
      shortDescription: 'Серебряная скульптура плакучей ивы в память о жертвах Холокоста в Венгрии.',
      transcript: `Скульптура плакучей ивы из серебра содержит имена сотен тысяч венгерских евреев, погибших в Холокосте. Мемориал создан при поддержке актера Тони Кертиса в память о его отце Эмануэле.`,
    },
  },
  'budapest-shoes-danube': {
    en: {
      name: 'Shoes on the Danube Bank Memorial',
      shortDescription: '60 pairs of iron period shoes along the riverbank honoring Jews murdered by Arrow Cross militiamen.',
      transcript: `Created by Can Togay and Gyula Pauer, this moving memorial represents Jews forced to remove their shoes before being shot into the Danube during the winter of 1944–1945.`,
    },
    he: {
      name: 'אנדרטת נעליים על הדנובה',
      shortDescription: '60 זוגות נעלי ברזל על גדת הנהר לזכר יהודים שנרצחו ונורו לתוך הדנובה בשואה.',
      transcript: `אנדרטה מרגשת ונוגעת ללב שנוצרה על ידי קאן טוגאי וגיולה פאואר. 60 זוגות נעלי הברזל בסגנון שנות ה-40 מסמלים את היהודים שנצטוו לחלוץ את נעליהם לפני שנורו למי הדנובה הקפואים בידי אנשי צלב החץ ב-1944–1945.`,
    },
    ru: {
      name: 'Мемориал «Туфли на набережной Дуная»',
      shortDescription: '60 пар чугунной обуви на набережной в память о евреях, расстрелянных у реки в 1944–1945 гг.',
      transcript: `Трогательный мемориал представляет собой 60 пар чугунной обуви стиля 1940-х годов в память о евреях, застреленных на берегу Дуная нацистскими нилашистами.`,
    },
  },
  'budapest-kazinczy-synagogue': {
    en: {
      name: 'Kazinczy Street Orthodox Synagogue',
      shortDescription: 'The center of Orthodox Jewish life in Budapest, built in Art Nouveau style in 1913.',
      transcript: `Designed by the Löffler brothers in 1913, Kazinczy Street Synagogue remains the beating heart of Orthodox Jewish life, kosher dining, and traditional learning in Budapest.`,
    },
    he: {
      name: 'בית הכנסת האורתודוקסי ברחוב קאזינצי',
      shortDescription: 'מרכז החיים האורתודוקסיים בבודפשט, נבנה בסגנון אר נובו ב-1913.',
      transcript: `בית הכנסת האורתודוקסי ברחוב קאזינצי נבנה בשנת 1913 בסגנון אר נובו מרשים. הוא מהווה עד היום את המרכז הפעיל של הקהילה האורתודוקסית, אוכל כשר ותלמוד תורה בבודפשט.`,
    },
    ru: {
      name: 'Ортодоксальная синагога на улице Казинци',
      shortDescription: 'Центр ортодоксальной еврейской жизни Будапешта, построенный в стиле модерн в 1913 году.',
      transcript: `Синагога на улице Казинци, построенная в 1913 году, является главным центром ортодоксальной общины Будапешта, кошерных ресторанов и изучения Торы.`,
    },
  },
  'budapest-wallenberg-memorial': {
    en: {
      name: 'Raoul Wallenberg Memorial Park',
      shortDescription: 'Honoring Swedish diplomat Raoul Wallenberg who saved tens of thousands of Hungarian Jews.',
      transcript: `Raoul Wallenberg issued protective Swedish passports (Schutz-Pass) and created safe houses, saving over 20,000 Jews in Budapest during 1944 before his tragic disappearance.`,
    },
    he: {
      name: 'פארק אנדרטת ראול ולנברג',
      shortDescription: 'הוקרה לדיפלומט השוודי ראול ולנברג שהציל עשרות אלפי יהודים בבודפשט.',
      transcript: `ראול ולנברג, חסיד אומות העולם, הנפיק דרכוני חסות שוודיים ("שוצפאס") והקים בתי מחסה מוגנים שהצילו עשרות אלפי יהודים בבודפשט בשנת 1944.`,
    },
    ru: {
      name: 'Мемориальный парк Рауля Валленберга',
      shortDescription: 'Парк в честь шведского дипломата Рауля Валленберга, спасшего десятки тысяч евреев.',
      transcript: `Шведский дипломат Рауль Валленберг выдавал защитные паспорта и создавал безопасные дома, спасшие более 20 000 евреев Будапешта в 1944 году.`,
    },
  },
  'vienna-stadttempel': {
    en: {
      name: 'Vienna Stadttempel (Main Synagogue)',
      shortDescription: 'The only historic synagogue in Vienna that survived Kristallnacht in 1938.',
      transcript: `Built in 1826 by Joseph Kornhäusel, Stadttempel was concealed inside a residential facade due to imperial laws. Because it was physically joined to homes, Nazis did not burn it on Kristallnacht.`,
    },
    he: {
      name: 'השטאדטטמפל של וינה (בית הכנסת המרכזי)',
      shortDescription: 'בית הכנסת ההיסטורי היחיד בווינה ששרד את ליל הבדולח ב-1938.',
      transcript: `השטאדטטמפל שנבנה בשנת 1826 על ידי אדריכל הקיסר יוזף קורנהויזל הוא בית הכנסת ההיסטורי היחיד בווינה ששרד את ליל הבדולח. מכיוון שנבנה בתוך חזית בניין מגורים עקב חוקי הקיסרות, הנאצים לא שרפו אותו מחשש לשריפת הבתים הסמוכים.`,
    },
    ru: {
      name: 'Венский Штадттемпель (Главная синагога)',
      shortDescription: 'Единственная историческая синагога Вены, пережившая Хрустальную ночь 1938 года.',
      transcript: `Штадттемпель, построенный в 1826 году, — единственная синагога Вены, уцелевшая в Хрустальную ночь. Скрытая за фасадом жилого дома, она сохранилась до наших дней.`,
    },
  },
  'vienna-judenplatz': {
    en: {
      name: 'Judenplatz & Rachel Whiteread Holocaust Memorial',
      shortDescription: 'The medieval Jewish square featuring Rachel Whiteread’s Nameless Library Holocaust memorial.',
      transcript: `Judenplatz is the ancient heart of Viennese Jewry since the 13th century. Rachel Whiteread’s concrete library sculpture symbolizes 65,000 Austrian Jews murdered in the Holocaust.`,
    },
    he: {
      name: 'כיכר היהודים (יודנפלאץ) ואנדרטת השואה',
      shortDescription: 'הכיכר היהודית בימי הביניים עם אנדרטת "הספרייה הללא שם" לזכר קרבנות השואה.',
      transcript: `יודנפלאץ היא הלב ההיסטורי של יהדות וינה מימי הביניים. במרכזה עומדת אנדרטת בטון בצורת ספרייה הפוכה שנוצרה על ידי רייצ'ל וייטריד, לזכר 65,000 יהודי אוסטריה שנרצחו בשואה.`,
    },
    ru: {
      name: 'Площадь Юденплац и мемориал Холокоста',
      shortDescription: 'Средневековая еврейская площадь с мемориалом «Безымянная библиотека» Рейчел Уайтред.',
      transcript: `Юденплац — исторический центр венгерско-австрийского еврейства с XIII века. Бетонный мемориал в виде перевернутой библиотеки посвящен 65 000 австрийских евреев.`,
    },
  },
  'vienna-herzl-residence': {
    en: {
      name: 'Theodor Herzl Vienna Residence',
      shortDescription: 'Herzl’s residence in Vienna where he edited Die Welt and led the Zionist Organization.',
      transcript: `Here in Vienna Theodor Herzl lived and worked as chief literary editor of the Neue Freie Presse, organizing the Zionist movement and negotiating with world leaders for Eretz Yisrael.`,
    },
    he: {
      name: 'בית בנימין זאב הרצל בווינה',
      shortDescription: 'מגוריו של הרצל בווינה בהם ערך את עיתון "די ולט" והוביל את התנועה הציונית.',
      transcript: `כאן בווינה התגורר בנימין זאב הרצל ופעל כעורך הבלטריסטיקה של ה"נויה פרייה פרסה". מכאן ניהל את פגישותיו עם מנהיגי עולם וכינס את הקונגרסים הציוניים למען תקומת ישראל.`,
    },
    ru: {
      name: 'Резиденция Теодора Герцля в Вене',
      shortDescription: 'Дом Герцля в Вене, где он издавал газету Die Welt и руководил сионистским движением.',
      transcript: `В Вене Теодор Герцль жил и работал редактором Neue Freie Presse, закладывая дипломатические основы для создания еврейского государства.`,
    },
  },
  'vienna-morzinplatz': {
    en: {
      name: 'Rothschild Hospital Aliyah Bet Transit Memorial',
      shortDescription: 'The crucial transit hub where 250,000 Jewish Holocaust survivors passed on their way to Eretz Yisrael.',
      transcript: `Between 1945 and 1952, the Rothschild Hospital served as the largest Displaced Persons transit station in Europe, organized by the Mossad LeAliyah Bet to bring survivors home to Israel.`,
    },
    he: {
      name: 'אנדרטת עליה ב׳ - בית החולים רוטשילד',
      shortDescription: 'תחנת המעבר המרכזית דרכה עברו 250,000 ניצולי שואה בדרכם לארץ ישראל.',
      transcript: `בית החולים רוטשילד בווינה שימש בין השנים 1945 ל-1952 כתחנת המעבר המרכזית של הבריחה והעפילה (עלייה ב׳). מעל 250,000 ניצולי שואה עברו כאן בדרכם לביתם בארץ ישראל.`,
    },
    ru: {
      name: 'Мемориал «Алия Бет» в госпитале Ротшильда',
      shortDescription: 'Транзитный пункт, через который 250 000 уцелевших в Холокосте отправлялись в Землю Израиля.',
      transcript: `В 1945–1952 годах госпиталь Ротшильда был главным транзитным лагерем для пережавших Холокост еврейских беженцев, направлявшихся в Израиль.`,
    },
  },
  'warsaw-polin-museum': {
    en: {
      name: 'POLIN Museum of the History of Polish Jews',
      shortDescription: 'Award-winning museum standing on the site of the Warsaw Ghetto, telling 1,000 years of Jewish history.',
      transcript: `POLIN Museum celebrates a millennium of Polish Jewish culture, resilience, and contributions, standing opposite Nathan Rapoport’s Ghetto Heroes Monument.`,
    },
    he: {
      name: 'מוזיאון פולין לתולדות יהודי פולין',
      shortDescription: 'מוזיאון מרהיב הניצב בלב גטו ורשה לשעבר ומציג 1,000 שנות מורשת יהודית.',
      transcript: `מוזיאון פולין הוקם בלב גטו ורשה לשעבר, מול אנדרטת רפפורט לגיבורי הגטו. המוזיאון מציג אלף שנות היסטוריה, תרבות ויצירה של יהדות פולין.`,
    },
    ru: {
      name: 'Музей истории польских евреев ПОЛИН',
      shortDescription: 'Всемирно известный музей на территории бывшег Варшавского гетто.',
      transcript: `Музей ПОЛИН рассказывает о тысячелетней истории польского еврейства, стоя напротив памятника Героям гетто Натана Рапопорта.`,
    },
  },
  'warsaw-mila-18': {
    en: {
      name: 'Miła 18 Warsaw Ghetto Uprising Command Bunker',
      shortDescription: 'The headquarters bunker where Mordechai Anielewicz and fighters made their ultimate stand in 1943.',
      transcript: `On May 8, 1943, Mordechai Anielewicz and 100 Jewish fighters made their heroic last stand inside this command bunker at Miła 18 during the Warsaw Ghetto Uprising.`,
    },
    he: {
      name: 'מפקדת מילא 18 - מרד גטו ורשה',
      shortDescription: 'בונקר המפקדה שבו נפלו מרדכי אנילביץ׳ ולוחמי הארגון היהודי הלוחם ב-1943.',
      transcript: `ב-8 במאי 1943, בבונקר זה ברחוב מילא 18, נפלו מרדכי אנילביץ' ולוחמי מרד גטו ורשה לאחר שניהלו את המרד העירוני הראשון נגד הנאצים באירופה הכבושה.`,
    },
    ru: {
      name: 'Бункер Мила 18 — Штаб восстания в Варшавском гетто',
      shortDescription: 'Штаб-бункер, где Мордехай Анелевич и бойцы сражались до последнего в 1943 году.',
      transcript: `8 мая 1943 года Мордехай Анелевич и 100 еврейских бойцов героически пали в бункере Мила 18 во время восстания в Варшавском гетто.`,
    },
  },
  'warsaw-nozyk-synagogue': {
    en: {
      name: 'Nożyk Synagogue',
      shortDescription: 'The only surviving pre-WWII synagogue in Warsaw, active since 1902.',
      transcript: `Built in 1902 by Zalman and Ryfka Nożyk, this Neo-Romanesque synagogue is the only surviving synagogue in Warsaw that endured World War II.`,
    },
    he: {
      name: 'בית הכנסת נוז׳יק',
      shortDescription: 'בית הכנסת היחיד בוורשה ששרד את מלחמת העולם השנייה, פעיל מ-1902.',
      transcript: `בית הכנסת נוז'יק שנבנה ב-1902 על ידי זלמן וריבקה נוז'יק הוא בית הכנסת היחיד בוורשה ששרד את המלחמה והחורבן וכיום משמש כמרכז הקהילה.`,
    },
    ru: {
      name: 'Синагога Ножиков',
      shortDescription: 'Единственная сохранившаяся синагога Варшавы, построенная до Второй мировой войны.',
      transcript: `Синагога Ножиков (1902) — единственная из 400 синагог Варшавы, уцелевшая в годы Второй мировой войны.`,
    },
  },
  'warsaw-janusz-korczak': {
    en: {
      name: 'Janusz Korczak Orphanage & Statue',
      shortDescription: 'Honoring Dr. Janusz Korczak who marched with his 200 orphans to Treblinka in 1942.',
      transcript: `Dr. Janusz Korczak (Henryk Goldszmit) refused safety and accompanied his 200 beloved orphans into Treblinka, embodying absolute love and moral heroism.`,
    },
    he: {
      name: 'בית הילדים והפסל לזכר יאנוש קורצ׳אק',
      shortDescription: 'הנצחת ד״ר יאנוש קורצ׳אק שצעד עם 200 יתומיו לטרבלינקה באוגוסט 1942.',
      transcript: `ד"ר יאנוש קורצ'ק (הנריק גולדשמיט) סירב להציל את עצמו וצעד בראש מורם עם 200 ילדי בית היתומים אל רכבות המוות לטרבלינקה באוגוסט 1942.`,
    },
    ru: {
      name: 'Детский дом и памятник Янушу Корчаку',
      shortDescription: 'В честь доктора Януша Корчака, пошедшего в Треблинку вместе со своими 200 сиротами.',
      transcript: `Доктор Януш Корчак отказался от спасения и пошел вместе со своими 200 воспитанниками в газовые камеры Треблинки в 1942 году.`,
    },
  },
  'prague-old-new-synagogue': {
    en: {
      name: 'Old-New Synagogue (Altneuschul)',
      shortDescription: 'Europe’s oldest active synagogue (1270) and legendary resting place of Maharal’s Golem.',
      transcript: `Completed in 1270 in Early Gothic style, Altneuschul is Europe's oldest active synagogue. According to legend, Rabbi Judah Loew (Maharal) stored the Golem in its attic.`,
    },
    he: {
      name: 'בית הכנסת אלטנוישול (הישן-חדש)',
      shortDescription: 'בית הכנסת הפעיל העתיק ביותר באירופה (1270) ומקום מנוחתו של הגולם מפראג.',
      transcript: `בית הכנסת אלטנוישול שנבנה בשנת 1270 הוא בית הכנסת הפעיל העתיק ביותר באירופה. לפי המסורת, בעליית הגג של בית כנסת זה טמן מהר"ל מפראג את הגולם.`,
    },
    ru: {
      name: 'Староновая синагога (Альтнойшуль)',
      shortDescription: 'Старейшая действующая синагога Европы (1270) и место легенды о Големе.',
      transcript: `Староновая синагога (1270) — старейшая действующая синагога Европы. По преданию, на её чердаке покоится Голем рабби Лёва (Махараля).`,
    },
  },
  'prague-old-cemetery': {
    en: {
      name: 'Old Jewish Cemetery Prague',
      shortDescription: 'One of the oldest surviving Jewish burial grounds with 12,000 headstones including the Maharal.',
      transcript: `Dating from the 15th century, this sacred cemetery holds layers of 12,000 gravestones, including Rabbi Judah Loew (Maharal) and Kli Yakar.`,
    },
    he: {
      name: 'בית העלמין היהודי העתיק בפראג',
      shortDescription: 'מבתי העלמין העתיקים בעולם עם 12,000 מצבות וקבר המהר״ל מפראג.',
      transcript: `בית העלמין היהודי העתיק בפראג מן המאה ה-15 מכיל 12,000 מצבות צפופות. שם טמון המהר"ל מפראג (רבי יהודה ליווא בן בצלאל) וגדולי חכמי אשכנז.`,
    },
    ru: {
      name: 'Старое еврейское кладбище в Праге',
      shortDescription: 'Одно из старейших кладбищ в мире с 12 000 надгробий, включая могилу Махараля.',
      transcript: `Основанное в XV веке кладбище содержит 12 000 надгробий. Здесь покоится рабби Лёв (Махараль из Праги).`,
    },
  },
  'prague-spanish-synagogue': {
    en: {
      name: 'Spanish Synagogue (Moorish Jewel)',
      shortDescription: 'Breathtaking Moorish Revival synagogue with gilded arabesques built in 1868.',
      transcript: `Built on the site of Prague's earliest 12th-century prayer house, the Spanish Synagogue boasts mesmerising Islamic-inspired gilding and stained glass.`,
    },
    he: {
      name: 'בית הכנסת הספרדי בפראג',
      shortDescription: 'פנינה ארכיטקטונית בסגנון מורי מוזהב שנבנתה בשנת 1868.',
      transcript: `בית הכנסת הספרדי בפראג נבנה ב-1868 בסגנון נאו-מורי מוזהב ומרהיב ביופיו. הוא מציג תערוכות על תולדות יהודי בוהמיה וקונצרטים קלאסיים.`,
    },
    ru: {
      name: 'Испанская синагога в Праге',
      shortDescription: 'Великолепная синагога в мавританском стиле с золотой арабеской (1868).',
      transcript: `Испанская синагога (1868) славится ошеломляющим мавританским золоченым интерьером и концертами классической музыки.`,
    },
  },
  'prague-kafka-monument': {
    en: {
      name: 'Franz Kafka Statue & Hebrew Legacy',
      shortDescription: 'Jaroslav Róna’s surrealist sculpture celebrating Prague’s literary master.',
      transcript: `Celebrating Franz Kafka, who studied Hebrew, contemplated Aliyah to Eretz Yisrael, and crafted masterpieces reflecting modern existential history.`,
    },
    he: {
      name: 'פסל פרנץ קפקא ומורשתו העברית',
      shortDescription: 'פסלו הסוריאליסטי של ירוסלב רונה לכבוד גאון הספרות של פראג.',
      transcript: `הפסל לכבוד פרנץ קפקא ליד בית הכנסת הספרדי. קפקא למד עברית בשנותיו האחרונות, חלם לעלות לארץ ישראל והותיר מורשת ספרותית עולמית.`,
    },
    ru: {
      name: 'Памятник Францу Кафке и ивритское наследие',
      shortDescription: 'Сюрреалистическая скульптура Ярослава Роны в честь гения мировой литературы.',
      transcript: `Памятник Францу Кафке. В последние годы жизни Кафка усердно изучал иврит и мечтал о переезде в Землю Израиля.`,
    },
  },
  'london-bevis-marks': {
    en: {
      name: 'Bevis Marks Synagogue (1701)',
      shortDescription: 'The oldest continuously operating Sephardic synagogue in the English-speaking world.',
      transcript: `Opened in 1701 by Spanish and Portuguese Sephardic Jews, Bevis Marks has burned candles for over 320 years and remains Britain's premier Sephardic cathedral synagogue.`,
    },
    he: {
      name: 'בית הכנסת בוויס מארקס (1701)',
      shortDescription: 'בית הכנסת הספרדי הפעיל העתיק ביותר בעולם דובר האנגלית.',
      transcript: `בית הכנסת בוויס מארקס הוקם בשנת 1701 על ידי אנוסי ספרד ופורטוגל. זהו בית הכנסת העתיק ביותר בבריטניה הפעיל ברציפות מעל 320 שנה.`,
    },
    ru: {
      name: 'Синагога Бевис-Маркс (1701)',
      shortDescription: 'Старейшая действующая сефардская синагога в англоязычном мире.',
      transcript: `Синагога Бевис-Маркс, открытая в 1701 году испанскими и португальскими сефардами, непрерывно действует уже более 320 лет.`,
    },
  },
  'london-balfour-declaration': {
    en: {
      name: '1917 Balfour Declaration Site',
      shortDescription: 'The historic location where Lord Balfour issued the British pledge for a Jewish National Home.',
      transcript: `On November 2, 1917, Foreign Secretary Arthur Balfour issued the historic Balfour Declaration to Lord Rothschild, paving the way for the State of Israel.`,
    },
    he: {
      name: 'אתר הצהרת בלפור (1917)',
      shortDescription: 'האתר ההיסטורי בלונדון שבו ניתנה התחייבות בריטניה להקמת בית לאומי לעם היהודי.',
      transcript: `ב-2 בנובמבר 1917 נשלחה מכאן הצהרת בלפור ההיסטורית מאת שר החוץ הבריטי ארתור בלפור אל הלורד רוטשילד, שהכירה בזכות העם היהודי לבית לאומי בארץ ישראל.`,
    },
    ru: {
      name: 'Место Декларации Бальфура 1917 года',
      shortDescription: 'Историческое место в Лондоне, где Великобритания поддержала создание еврейского очага.',
      transcript: `2 ноября 1917 года министр иностранных дел Артур Бальфур направил лорду Ротшильду историческую Декларацию Бальфура.`,
    },
  },
  'london-montefiore': {
    en: {
      name: 'Sir Moses Montefiore Heritage & Royal Exchange',
      shortDescription: 'Honoring Sir Moses Montefiore, the legendary Sephardic philanthropist who built Mishkenot Sha’ananim in Jerusalem.',
      transcript: `Sir Moses Montefiore was a titan of London finance and world Jewry, knighted by Queen Victoria andbuilder of the first neighborhood outside Jerusalem's Old City walls.`,
    },
    he: {
      name: 'מורשת סר משה מונטיפיורי והבורסה המלכותית',
      shortDescription: 'הוקרה לנגיד ופילנתרופ הספרדי הדגול שטיפח את ירושלים והקים את משכנות שאננים.',
      transcript: `סר משה מונטיפיורי היה נשיא ועד שליחי הקהילות בבריטניה ופילנתרופ ספרדי דגול. הוא יזם והקים את משכנות שאננים, השכונה הראשונה מחוץ לחומות ירושלים.`,
    },
    ru: {
      name: 'Наследие сэра Мозеса Монтефиоре',
      shortDescription: 'В честь сефардского филантропа, построившего первый квартал вне стен Иерусалима.',
      transcript: `Сэр Мозес Монтефиоре — выдающийся филантроп Лондона, посвятивший жизнь помощи евреям мира и развитию Иерусалима.`,
    },
  },
  'london-east-end': {
    en: {
      name: 'East End Jewish Heritage Trail',
      shortDescription: 'Walking through Brick Lane, Sandy’s Row Synagogue, and the birthplace of British Zionism.',
      transcript: `Discover the vibrant immigrant East End where over 150,000 Jews settled, giving birth to Zionist trade unions and Yiddish theatre.`,
    },
    he: {
      name: 'מסלול המורשת היהודית באיסט אנד',
      shortDescription: 'סיור ברחוב בריק ליין, בית הכנסת סנדיס רו וערש הציונות הבריטית.',
      transcript: `סיור במתחם האיסט אנד ההיסטורי של לונדון שבו התגוררו מעל 150,000 יהודים. כאן פרחו תיאטרון היידיש, עיתונות עברית ואיגודים ציוניים.`,
    },
    ru: {
      name: 'Маршрут еврейского Ист-Энда',
      shortDescription: 'Прогулка по Брик-Лейн, синагоге Сэндис-Роу и родине британского сионизма.',
      transcript: `Исторический Ист-Энд Лондона принял 150 000 еврейских иммигрантов, став центром еврейской культуры и сионизма.`,
    },
  },
};

// City Translations
export const CITY_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, { name: string; subtitle: string; description: string }>>> = {
  budapest: {
    en: {
      name: 'Budapest',
      subtitle: 'Great Synagogues, Theodor Herzl & Heroes of Sepharad and Ashkenaz',
      description: 'Explore Europe’s largest Jewish district, from Theodor Herzl’s birthplace to the poignant Shoes on the Danube Bank and Raoul Wallenberg’s rescue legacy.',
    },
    he: {
      name: 'בודפשט',
      subtitle: 'בתי הכנסת הגדולים, בנימין זאב הרצל וגיבורי ישראל',
      description: 'סיירו ברובע היהודי המרשים באירופה, ממקום הולדתו של הרצל ועד אנדרטת הנעליים על הדנובה וראול ולנברג.',
    },
    ru: {
      name: 'Будапешт',
      subtitle: 'Великие синагоги, Теодор Герцль и герои спасения',
      description: 'Исследуйте крупнейший еврейский квартал Европы — от дома Герцля до мемориала на Дунае.',
    },
  },
  vienna: {
    en: {
      name: 'Vienna',
      subtitle: 'Stadttempel, Fin-de-Siècle Intellectuals & Modern Zionist Roots',
      description: 'Journey through imperial Vienna, discovering the hidden Stadttempel, Judenplatz Holocaust Memorial, and Theodor Herzl’s pivotal political transformation.',
    },
    he: {
      name: 'ווינה',
      subtitle: 'השטאדטטמפל, יודנפלאץ ושורשי הציונות המדינית',
      description: 'מסע בווינה הקיסרית דרך בית הכנסת ששרד את ליל הבדולח, אנדרטת יודנפלאץ ובית הרצל.',
    },
    ru: {
      name: 'Вена',
      subtitle: 'Штадттемпель, Юденплац и истоки сионизма',
      description: 'Путешествие по имперской Вене: синагога Штадттемпель, Юденплац и дом Теодора Герцля.',
    },
  },
  warsaw: {
    en: {
      name: 'Warsaw',
      subtitle: '1,000 Years of Polish Jewry, Ghetto Heroes & Israel Bonds',
      description: 'Walk the sacred ground of POLIN Museum, the Warsaw Ghetto Uprising bunker at Miła 18, and honor Mordechai Anielewicz and Janusz Korczak.',
    },
    he: {
      name: 'ורשה',
      subtitle: '1,000 שנות יהדות פולין, גיבורי המרד ויאנוש קורצ׳אק',
      description: 'סיירו במוזיאון פולין, בבונקר המפקדה במילא 18, ובבית הילדים של יאנוש קורצ׳אק.',
    },
    ru: {
      name: 'Варшава',
      subtitle: '1000 лет польского еврейства и герои гетто',
      description: 'Музей ПОЛИН, бункер восстания Мила 18 и мемориал Януша Корчака.',
    },
  },
  prague: {
    en: {
      name: 'Prague',
      subtitle: 'The Maharal’s Golem, Old-New Synagogue & Kafka’s Mysticism',
      description: 'Immerse in the magical Josefov quarter, home to Europe’s oldest active synagogue, the legendary Golem attic, and Franz Kafka’s Hebrew studies.',
    },
    he: {
      name: 'פראג',
      subtitle: 'הגולם מהר״ל, בית הכנסת אלטנוישול וקפקא',
      description: 'סיירו ברובע יוספוב הקסום, בבית הכנסת העתיק באירופה מ-1270 ובמורשת קפקא.',
    },
    ru: {
      name: 'Прага',
      subtitle: 'Голем Махараля, Староновая синагога и Кафка',
      description: 'Еврейский квартал Йозефов, древнейшая синагога Европы и наследие Франца Кафки.',
    },
  },
  london: {
    en: {
      name: 'London',
      subtitle: 'Bevis Marks Sephardic Cathedral, Montefiore & Balfour Declaration',
      description: 'Discover 350 years of Anglo-Jewish history, from 1701 Bevis Marks to Sir Moses Montefiore’s Jerusalem vision and the site of the 1917 Balfour Declaration.',
    },
    he: {
      name: 'לונדון',
      subtitle: 'בוויס מארקס הספרדית, הצהרת בלפור וסר משה מונטיפיורי',
      description: 'גלו 350 שנות מורשת אנגלו-יהודית מבית הכנסת מ-1701 ועד הצהרת בלפור 1917.',
    },
    ru: {
      name: 'Лондон',
      subtitle: 'Сефардская Бевис-Маркс, Декларация Бальфура и Монтефиоре',
      description: '350 лет англо-еврейской истории: синагога 1701 года и место Декларации Бальфура.',
    },
  },
  modiin: {
    en: {
      name: "Modi'in",
      subtitle: 'Cradle of the Hasmoneans, Ancient Maccabean Graves & Heritage Museum',
      description: 'Step into the legendary birthplace of the Maccabean Revolt against the Seleucid Empire. Explore ancient Hasmonean fortresses, ancient synagogues, the Heritage Museum, and sacred burial sites in the Judaean foothills.',
    },
    he: {
      name: 'מודיעין',
      subtitle: 'ערש מורשת החשמונאים, קברי המכבים ומוזיאון המורשת',
      description: 'סיירו בעיר הולדתם של המכבים ופרוץ מרד החשמונאים. גלו בתי כנסת עתיקים, מצודות חשמונאיות, את מוזיאון המורשת וקברי המכבים.',
    },
    ru: {
      name: 'Модиин',
      subtitle: 'Колыбель Хасмонеев, гробницы Маккавеев и Музей наследия',
      description: 'Исследуйте родину восстания Маккавеев: древние синагоги, крепости Хасмонеев, Музей наследия и гробницы героев.',
    },
  },
};

// Helper to translate site
export function getTranslatedSite(site: HeritageSite, lang: LanguageCode): HeritageSite {
  if (lang === 'en') return site;

  const translation = lang === 'fr'
    ? FRENCH_SITE_TRANSLATIONS[site.id]
    : SUPPLEMENTAL_SITE_TRANSLATIONS[site.id]?.[lang as 'he' | 'ru'] || SITE_TRANSLATIONS[site.id]?.[lang];
  if (!translation) return site;

  return {
    ...site,
    name: translation.name || site.name,
    shortDescription: translation.shortDescription || site.shortDescription,
    transcript: translation.transcript || site.transcript,
  };
}

// Helper to translate city
export function getTranslatedCity(city: TourCity, lang: LanguageCode): TourCity {
  if (lang === 'en') return city;

  const translation = lang === 'fr' ? FRENCH_CITY_TRANSLATIONS[city.id] : CITY_TRANSLATIONS[city.id]?.[lang];
  if (!translation) return city;

  return {
    ...city,
    name: translation.name || city.name,
    subtitle: translation.subtitle || city.subtitle,
    description: translation.description || city.description,
  };
}

// Simple t() function
export function t(key: string, lang: LanguageCode): string {
  return TOUR_CONTROL_UI_TRANSLATIONS[lang]?.[key] || SAVED_PANEL_UI_TRANSLATIONS[lang]?.[key] || UI_TRANSLATIONS[lang]?.[key] || TOUR_CONTROL_UI_TRANSLATIONS.en[key] || SAVED_PANEL_UI_TRANSLATIONS.en[key] || UI_TRANSLATIONS.en?.[key] || key;
}
