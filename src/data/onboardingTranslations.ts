import type { LanguageCode } from './translations';

export type OnboardingStep = {
  title: string;
  body: string;
  points: string[];
};

export type OnboardingCopy = {
  welcome: string;
  skip: string;
  back: string;
  next: string;
  start: string;
  progress: string;
  replayTitle: string;
  replayDescription: string;
  steps: OnboardingStep[];
};

export const ONBOARDING_COPY: Record<LanguageCode, OnboardingCopy> = {
  en: {
    welcome: 'Welcome to Tudela Global', skip: 'Skip', back: 'Back', next: 'Next', start: 'Start exploring', progress: 'Introduction step',
    replayTitle: 'Replay app introduction', replayDescription: 'See the short guide to discovering, walking and saving tours again.',
    steps: [
      { title: 'Choose your heritage journey', body: 'Start in Discover and select a city. When a city has several tours, compare them before choosing one.', points: ['Browse tours by city', 'Review the ordered stops before starting'] },
      { title: 'Walk with confidence', body: 'Live Walk combines the route, your location and narrated stop stories in one comfortable view.', points: ['Allow location access for live GPS', 'Use play, pause, stop and transcript controls'] },
      { title: 'Make the tour your own', body: 'Save useful stops, ask the AI guide questions and return to your saved content when you need it.', points: ['Save stops and personal notes', 'Change language or replay this guide in Settings'] },
    ],
  },
  he: {
    welcome: 'ברוכים הבאים ל-Tudela Global', skip: 'דלג', back: 'חזרה', next: 'הבא', start: 'התחילו לגלות', progress: 'שלב במדריך',
    replayTitle: 'הפעלה חוזרת של מדריך האפליקציה', replayDescription: 'צפו שוב במדריך הקצר לגילוי, הליכה ושמירת סיורים.',
    steps: [
      { title: 'בחרו את מסע המורשת שלכם', body: 'התחילו במסך הגילוי ובחרו עיר. אם יש כמה סיורים בעיר, השוו ביניהם לפני הבחירה.', points: ['עיינו בסיורים לפי עיר', 'בדקו את סדר התחנות לפני ההתחלה'] },
      { title: 'טיילו בביטחון', body: 'המסלול החי משלב את נתיב הסיור, המיקום שלכם וסיפורים מוקלטים במסך אחד ונוח.', points: ['אפשרו גישה למיקום עבור GPS חי', 'השתמשו בהפעלה, השהיה, עצירה ותמליל'] },
      { title: 'התאימו את הסיור לעצמכם', body: 'שמרו תחנות שימושיות, שאלו את מדריך ה-AI וחזרו לתוכן השמור בעת הצורך.', points: ['שמרו תחנות והערות אישיות', 'שנו שפה או הפעילו שוב את המדריך בהגדרות'] },
    ],
  },
  ru: {
    welcome: 'Добро пожаловать в Tudela Global', skip: 'Пропустить', back: 'Назад', next: 'Далее', start: 'Начать знакомство', progress: 'Шаг знакомства',
    replayTitle: 'Повторить знакомство с приложением', replayDescription: 'Снова откройте краткое руководство по поиску, прохождению и сохранению туров.',
    steps: [
      { title: 'Выберите маршрут по наследию', body: 'Начните в разделе «Открыть» и выберите город. Если туров несколько, сравните их перед выбором.', points: ['Просматривайте туры по городам', 'Проверьте порядок остановок до начала'] },
      { title: 'Гуляйте уверенно', body: 'Живой маршрут объединяет путь, ваше местоположение и озвученные истории в одном удобном экране.', points: ['Разрешите доступ к геолокации для GPS', 'Используйте воспроизведение, паузу, остановку и текст'] },
      { title: 'Настройте тур для себя', body: 'Сохраняйте остановки, задавайте вопросы AI-гиду и возвращайтесь к сохранённым материалам.', points: ['Сохраняйте остановки и личные заметки', 'Меняйте язык или повторяйте это руководство в настройках'] },
    ],
  },
  fr: {
    welcome: 'Bienvenue sur Tudela Global', skip: 'Passer', back: 'Retour', next: 'Suivant', start: 'Commencer à explorer', progress: 'Étape de présentation',
    replayTitle: 'Revoir la présentation de l’application', replayDescription: 'Revoyez le guide rapide pour découvrir, parcourir et enregistrer des visites.',
    steps: [
      { title: 'Choisissez votre parcours patrimonial', body: 'Commencez dans Découvrir et choisissez une ville. Si plusieurs visites sont proposées, comparez-les avant de choisir.', points: ['Parcourez les visites par ville', 'Vérifiez l’ordre des étapes avant de commencer'] },
      { title: 'Marchez en toute confiance', body: 'Le parcours en direct réunit l’itinéraire, votre position et les récits audio dans une vue confortable.', points: ['Autorisez la localisation pour le GPS en direct', 'Utilisez lecture, pause, arrêt et transcription'] },
      { title: 'Personnalisez votre visite', body: 'Enregistrez des étapes, interrogez le guide IA et retrouvez votre contenu lorsque vous en avez besoin.', points: ['Enregistrez des étapes et des notes', 'Changez de langue ou relancez ce guide dans Réglages'] },
    ],
  },
  de: {
    welcome: 'Willkommen bei Tudela Global', skip: 'Überspringen', back: 'Zurück', next: 'Weiter', start: 'Jetzt entdecken', progress: 'Einführungsschritt',
    replayTitle: 'App-Einführung wiederholen', replayDescription: 'Zeigen Sie die Kurzanleitung zum Entdecken, Gehen und Speichern von Touren erneut an.',
    steps: [
      { title: 'Wählen Sie Ihre Kulturerbe-Tour', body: 'Beginnen Sie unter Entdecken und wählen Sie eine Stadt. Bei mehreren Touren können Sie diese zuerst vergleichen.', points: ['Touren nach Stadt durchsuchen', 'Reihenfolge der Stopps vor dem Start prüfen'] },
      { title: 'Sicher unterwegs', body: 'Live-Rundgang verbindet Route, Standort und erzählte Geschichten in einer übersichtlichen Ansicht.', points: ['Standortzugriff für Live-GPS erlauben', 'Wiedergabe, Pause, Stopp und Transkript nutzen'] },
      { title: 'Gestalten Sie Ihre Tour', body: 'Speichern Sie Stopps, fragen Sie den KI-Guide und öffnen Sie gespeicherte Inhalte jederzeit erneut.', points: ['Stopps und persönliche Notizen speichern', 'Sprache ändern oder diese Einführung in Einstellungen wiederholen'] },
    ],
  },
  es: {
    welcome: 'Te damos la bienvenida a Tudela Global', skip: 'Omitir', back: 'Atrás', next: 'Siguiente', start: 'Empezar a explorar', progress: 'Paso de introducción',
    replayTitle: 'Repetir la introducción de la aplicación', replayDescription: 'Vuelve a consultar la guía breve para descubrir, recorrer y guardar tours.',
    steps: [
      { title: 'Elige tu recorrido patrimonial', body: 'Empieza en Descubrir y selecciona una ciudad. Si hay varios tours, compáralos antes de elegir.', points: ['Explora los tours por ciudad', 'Revisa el orden de las paradas antes de empezar'] },
      { title: 'Camina con confianza', body: 'El recorrido en directo reúne la ruta, tu ubicación y las historias narradas en una vista cómoda.', points: ['Permite la ubicación para usar el GPS', 'Usa reproducción, pausa, parada y transcripción'] },
      { title: 'Haz tuyo el tour', body: 'Guarda paradas, pregunta al guía de IA y vuelve al contenido guardado cuando lo necesites.', points: ['Guarda paradas y notas personales', 'Cambia el idioma o repite esta guía desde Ajustes'] },
    ],
  },
};
