import React from 'react';
import { MapPin } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { useModalFocus } from '../hooks/useModalFocus';
const copy = {
  en: ['Use your location this visit?', 'Location helps find nearby sites and guide your walk. You can explore without it. We ask again whenever you open the app.', 'Turn location on', 'Keep location off'],
  he: ['להשתמש במיקום שלך בביקור הזה?', 'המיקום עוזר למצוא אתרים קרובים ולהנחות את ההליכה. אפשר לגלוש גם בלי מיקום. נשאל שוב בכל פתיחה של האפליקציה.', 'הפעלת מיקום', 'להשאיר מיקום כבוי'],
  fr: ['Utiliser votre position cette fois ?', 'La position aide à trouver les sites proches et à vous guider. Vous pouvez explorer sans elle. Nous demanderons à chaque ouverture.', 'Activer la position', 'Garder la position désactivée'],
  de: ['Standort für diesen Besuch nutzen?', 'Der Standort hilft bei nahen Orten und beim Rundgang. Sie können auch ohne Standort erkunden. Wir fragen bei jedem Öffnen erneut.', 'Standort einschalten', 'Standort ausgeschaltet lassen'],
  es: ['¿Usar tu ubicación en esta visita?', 'La ubicación ayuda a encontrar lugares cercanos y guiar el recorrido. Puedes explorar sin ella. Preguntamos cada vez que abres la aplicación.', 'Activar ubicación', 'Mantener ubicación desactivada'],
  ru: ['Использовать геолокацию сейчас?', 'Геолокация помогает находить места поблизости и вести прогулку. Можно пользоваться без неё. Мы спрашиваем при каждом открытии.', 'Включить геолокацию', 'Оставить выключенной'],
};
export function LocationChoiceModal({isOpen,language,onChoose}:{isOpen:boolean;language:LanguageCode;onChoose:(enabled:boolean)=>void}) {
  const ref=useModalFocus(isOpen,()=>onChoose(false));
  if(!isOpen)return null;
  const text=copy[language] || copy.en;
  return <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="location-choice-title" dir={language==='he'?'rtl':'ltr'} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/65 p-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"><MapPin className="mb-4 h-9 w-9 text-blue-900"/><h2 id="location-choice-title" className="text-xl font-bold text-blue-950">{text[0]}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{text[1]}</p><div className="mt-6 space-y-3"><button onClick={()=>onChoose(true)} className="w-full rounded-xl bg-blue-950 px-4 py-3 font-bold text-white">{text[2]}</button><button onClick={()=>onChoose(false)} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">{text[3]}</button></div></div></div>;
}
