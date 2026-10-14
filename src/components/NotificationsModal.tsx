import React, { useState } from 'react';
import { Bell, X, Compass, CheckCircle2, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { NotificationItem } from '../types';
import { useModalFocus } from '../hooks/useModalFocus';
import { LanguageCode } from '../data/translations';

const COPY: Record<LanguageCode, { title:string; subtitle:string; mobile:string; on:string; off:string; explanation:string; enable:string; enabled:string; feed:string; read:string; none:string; close:string }> = {
  en:{title:'Arrival alerts',subtitle:'Updates during your walk',mobile:'Phone alerts',on:'On',off:'Off',explanation:'Allow alerts so Moreshet can tell you when you reach a tour stop.',enable:'Allow arrival alerts',enabled:'Arrival alerts are on',feed:'Your updates',read:'Mark all as read',none:'No updates yet.',close:'Close alerts'},
  he:{title:'התראות הגעה',subtitle:'עדכונים במהלך הסיור',mobile:'התראות בטלפון',on:'פועל',off:'כבוי',explanation:'אפשרו התראות כדי ש-Moreshet תודיע כשהגעתם לתחנה.',enable:'אפשר התראות הגעה',enabled:'התראות ההגעה פועלות',feed:'העדכונים שלכם',read:'סימון הכול כנקרא',none:'עדיין אין עדכונים.',close:'סגירת התראות'},
  fr:{title:'Alertes d’arrivée',subtitle:'Mises à jour pendant la visite',mobile:'Alertes du téléphone',on:'Activées',off:'Désactivées',explanation:'Autorisez les alertes pour que Moreshet vous prévienne lorsque vous atteignez une étape.',enable:'Autoriser les alertes',enabled:'Les alertes d’arrivée sont activées',feed:'Vos mises à jour',read:'Tout marquer comme lu',none:'Aucune mise à jour.',close:'Fermer les alertes'},
  ru:{title:'Оповещения о прибытии',subtitle:'Обновления во время прогулки',mobile:'Оповещения телефона',on:'Вкл.',off:'Выкл.',explanation:'Разрешите оповещения, чтобы Moreshet сообщала о прибытии к остановке.',enable:'Разрешить оповещения',enabled:'Оповещения включены',feed:'Ваши обновления',read:'Отметить всё прочитанным',none:'Обновлений пока нет.',close:'Закрыть оповещения'},
  de:{title:'Ankunftshinweise',subtitle:'Meldungen während der Tour',mobile:'Telefonhinweise',on:'Ein',off:'Aus',explanation:'Erlauben Sie Hinweise, damit Moreshet Ihre Ankunft an einem Stopp melden kann.',enable:'Ankunftshinweise erlauben',enabled:'Ankunftshinweise sind eingeschaltet',feed:'Ihre Meldungen',read:'Alle als gelesen markieren',none:'Noch keine Meldungen.',close:'Hinweise schließen'},
  es:{title:'Avisos de llegada',subtitle:'Actualizaciones durante el recorrido',mobile:'Avisos del teléfono',on:'Activados',off:'Desactivados',explanation:'Permite avisos para que Moreshet te indique cuándo llegas a una parada.',enable:'Permitir avisos de llegada',enabled:'Los avisos de llegada están activados',feed:'Tus actualizaciones',read:'Marcar todo como leído',none:'Aún no hay actualizaciones.',close:'Cerrar avisos'},
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onSimulatePushAlert: () => void;
  showSimulator?: boolean;
  selectedLanguage: LanguageCode;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSimulatePushAlert,
  showSimulator = false,
  selectedLanguage,
}) => {
  const copy = COPY[selectedLanguage];
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const modalRef = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermissionState(res);
      } catch (err) {
        console.error('Push notification permission error:', err);
      }
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-0 text-gray-900 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
      <div className="flex max-h-[calc(100dvh-env(safe-area-inset-top,0px))] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-gray-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-[32px]">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-900 border border-blue-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="notifications-title" className="text-base font-bold leading-none text-gray-900 sm:text-lg">
                {copy.title}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={copy.close}
            className="p-1.5 text-gray-600 hover:text-gray-900 bg-gray-50 rounded-xl border border-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:p-5">
          {/* Push Notification Permission Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                {copy.mobile}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  permissionState === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {permissionState === 'granted' ? copy.on : copy.off}
              </span>
            </div>

            <p className="text-gray-600 leading-relaxed">
              {copy.explanation}
            </p>

            {permissionState !== 'granted' ? (
              <button
                onClick={handleRequestPushPermission}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
              >
                {copy.enable}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                <CheckCircle2 className="w-4 h-4" />
                <span>{copy.enabled}</span>
              </div>
            )}
          </div>

          {/* Test Proximity Alert Simulator Button */}
          {showSimulator && <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs">
            <div>
              <span className="font-bold text-gray-900">QA arrival simulator</span>
              <p className="text-[11px] text-gray-600">Tests the selected tour’s next stop. Not a real GPS arrival.</p>
            </div>
            <button
              onClick={onSimulatePushAlert}
              className="px-3.5 py-1.5 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-800"
            >
              Test next stop
            </button>
          </div>}

          {/* Notifications Feed List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-bold text-gray-900">{copy.feed}</span>
              {notifications.some((n) => !n.read) && (
                <button onClick={onMarkAllAsRead} className="text-blue-900 hover:underline font-bold">
                  {copy.read}
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">{copy.none}</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 transition-all ${
                    item.read
                      ? 'bg-gray-50 border-gray-200 text-gray-600'
                      : 'bg-blue-50/80 border-blue-100 text-blue-950 font-medium shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      {item.type === 'proximity' ? (
                        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Compass className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {item.title}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">{item.time}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-[11px]">{item.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
