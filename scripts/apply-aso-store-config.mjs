import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('store.config.json', 'utf8'));

const copy = {
  'en-GB': {
    title: 'Foxiem: Tally Counter',
    subtitle: 'Habits, Reps & Daily Tracker',
    keywords: 'multi,clicker,counting,score,inventory,attendance,streak,goal,routine,people,number,progress',
    promoText:
      'Now with multiple named counters: switch between activities and view stats, history and streaks for each one.',
    releaseNotes:
      'The App Store now lists Foxiem in English, Turkish, German, French, Spanish and Italian.',
    description: `Foxiem is a calm, simple tally counter for anything you want to count — habits, gym reps, reading, attendance, scores, routines, or everyday activities.

CREATE MULTIPLE COUNTERS
Give each counter a name and keep different activities separate. Switch between counters from Home, Statistics, History, and Consistency.

COUNT FAST
Use +1, +5, or -1 to record progress in seconds. Reset the active counter whenever you want a fresh start.

SEE YOUR PROGRESS
Review activity history, daily, weekly and monthly statistics, and consistency streaks for the selected counter.

STAY CONSISTENT
Create local reminders for the days and times that suit your routine.

SIMPLE BY DESIGN
Foxiem is built to stay out of the way: no account, no complicated setup, and a clean interface focused on counting.

Your Foxiem counter data, history, profile, reminders and preferences are stored on your device. Advertising and analytics practices are described in the app's privacy information and privacy policy.

Use Foxiem for:
- daily habits and routines
- gym reps and practice sessions
- reading or learning activities
- attendance and people counting
- scores and repeated tasks
- anything else you want to count consistently

Small counts. Big progress.`,
  },
  tr: {
    title: 'Foxiem: Çoklu Sayaç',
    subtitle: 'Alışkanlık, Tekrar, İlerleme',
    keywords: 'sayma,sayıcı,tıklama,zikir,tesbih,zikirmatik,skor,spor,rutin,günlük,kişi,adet,sayım',
    promoText:
      'Artık birden fazla isimli sayaç var: aktiviteler arasında geçiş yap, her biri için istatistik, geçmiş ve serileri gör.',
    releaseNotes:
      'App Store artık Foxiem’i İngilizce, Türkçe, Almanca, Fransızca, İspanyolca ve İtalyanca olarak listeliyor.',
    description: `Foxiem; alışkanlıkları, spor tekrarlarını, okumayı, günlük rutinleri, kişi sayısını, skorları veya saymak istediğin herhangi bir şeyi takip etmek için sade bir çoklu sayaçtır.

BİRDEN FAZLA SAYAÇ OLUŞTUR
Her sayaca bir isim ver ve farklı aktivitelerini birbirinden ayır. Ana Sayfa, İstatistikler, Geçmiş ve Tutarlılık ekranlarında aktif sayaçlar arasında kolayca geçiş yap.

HIZLI SAY
+1, +5 ve -1 kontrolleriyle ilerlemeni saniyeler içinde kaydet. Yeniden başlamak istediğinde aktif sayacı sıfırla.

İLERLEMENİ GÖR
Seçili sayacın aktivite geçmişini, günlük/haftalık/aylık istatistiklerini ve devam serilerini incele.

DÜZENİNİ KORU
Sana uygun gün ve saatler için cihazında çalışan yerel hatırlatıcılar oluştur.

SADE KALIR
Foxiem hesap açmanı istemez ve karmaşık kurulumlarla uğraştırmaz. Sayaçların, sayım geçmişin, profilin, hatırlatıcıların ve tercihlerin cihazında saklanır. Reklam ve analiz hizmetleriyle ilgili veri kullanımı uygulamanın gizlilik bilgilerinde ve gizlilik politikasında açıklanır.

Foxiem'i şunlar için kullanabilirsin:
- günlük alışkanlıklar ve rutinler
- spor tekrarları ve antrenman
- okuma ve çalışma
- kişi ve katılım sayımı
- skor veya tekrar eden işler
- zikir/tesbih gibi tekrar sayımları
- düzenli olarak saymak istediğin her şey

Küçük sayımlar. Büyük ilerleme.`,
  },
  'de-DE': {
    title: 'Foxiem: Mehrfachzähler',
    subtitle: 'Gewohnheiten & Fortschritt',
    keywords:
      'klickzähler,zählen,wiederholungen,punkte,inventar,serie,ziele,routine,personen,statistik,täglich',
    promoText:
      'Jetzt mit mehreren benannten Zählern: Wechsle zwischen Aktivitäten und sieh Statistiken, Verlauf und Serien für jeden Zähler.',
    releaseNotes:
      'Der App Store listet Foxiem jetzt auf Englisch, Türkisch, Deutsch, Französisch, Spanisch und Italienisch.',
    description: `Foxiem ist ein ruhiger, einfacher Mehrfachzähler für alles, was du zählen möchtest — Gewohnheiten, Wiederholungen beim Training, Lesen, Personen, Punkte, Routinen oder andere Alltagsaktivitäten.

MEHRERE ZÄHLER
Gib jedem Zähler einen Namen und halte deine Aktivitäten getrennt. Wechsle auf Start, Statistik, Verlauf und Konsistenz zwischen deinen Zählern.

SCHNELL ZÄHLEN
Erfasse mit +1, +5 und -1 jeden Schritt in Sekunden und setze den aktiven Zähler bei Bedarf zurück.

FORTSCHRITT VERFOLGEN
Sieh Verlauf, tägliche, wöchentliche und monatliche Statistiken sowie deine Serien für den ausgewählten Zähler.

ERINNERUNGEN
Erstelle lokale Erinnerungen für die Tage und Uhrzeiten, die zu deiner Routine passen.

EINFACH UND LOKAL
Kein Konto und keine komplizierte Einrichtung. Deine Foxiem-Zähler, dein Verlauf, Profil, Erinnerungen und Einstellungen werden auf deinem Gerät gespeichert. Informationen zu Werbung und Analyse findest du in den Datenschutzangaben und der Datenschutzerklärung.

Kleine Zählungen. Großer Fortschritt.`,
  },
  'fr-FR': {
    title: 'Foxiem : Compteur multiple',
    subtitle: 'Habitudes, séries & progrès',
    keywords: 'comptage,clic,répétitions,score,inventaire,objectif,routine,personnes,statistiques,quotidien',
    promoText:
      'Désormais avec plusieurs compteurs nommés : passez d’une activité à l’autre et consultez statistiques, historique et séries.',
    releaseNotes:
      'L’App Store affiche désormais Foxiem en anglais, turc, allemand, français, espagnol et italien.',
    description: `Foxiem est un compteur multiple simple et apaisant pour tout ce que vous souhaitez compter : habitudes, répétitions sportives, lecture, personnes, scores, routines ou activités du quotidien.

PLUSIEURS COMPTEURS
Donnez un nom à chaque compteur et séparez vos activités. Passez facilement d’un compteur à l’autre depuis l’accueil, les statistiques, l’historique et la régularité.

COMPTEZ RAPIDEMENT
Utilisez +1, +5 et -1 pour enregistrer une progression en quelques secondes. Réinitialisez le compteur actif lorsque vous souhaitez recommencer.

SUIVEZ VOS PROGRÈS
Consultez l’historique, les statistiques quotidiennes, hebdomadaires et mensuelles, ainsi que les séries du compteur sélectionné.

RESTEZ RÉGULIER
Créez des rappels locaux adaptés à votre routine.

SIMPLE ET LOCAL
Aucun compte n’est nécessaire. Vos compteurs Foxiem, votre historique, votre profil, vos rappels et vos préférences sont stockés sur votre appareil. Les pratiques liées à la publicité et aux statistiques sont décrites dans les informations de confidentialité de l’app.

De petits comptes. De grands progrès.`,
  },
  'es-ES': {
    title: 'Foxiem: Contador múltiple',
    subtitle: 'Hábitos, rachas y progreso',
    keywords: 'conteo,clic,repeticiones,puntuación,inventario,objetivo,rutina,personas,estadísticas,diario',
    promoText:
      'Ahora con varios contadores con nombre: cambia de actividad y consulta estadísticas, historial y rachas de cada contador.',
    releaseNotes:
      'El App Store muestra Foxiem en inglés, turco, alemán, francés, español e italiano.',
    description: `Foxiem es un contador múltiple sencillo y tranquilo para todo lo que quieras contar: hábitos, repeticiones de ejercicio, lectura, personas, puntuaciones, rutinas o actividades diarias.

VARIOS CONTADORES
Pon un nombre a cada contador y mantén separadas tus actividades. Cambia de contador desde Inicio, Estadísticas, Historial y Constancia.

CUENTA RÁPIDO
Usa +1, +5 y -1 para registrar tu progreso en segundos. Restablece el contador activo cuando quieras empezar de nuevo.

MIRA TU PROGRESO
Consulta el historial, las estadísticas diarias, semanales y mensuales y las rachas del contador seleccionado.

MANTÉN LA CONSTANCIA
Crea recordatorios locales para los días y horas que mejor encajen con tu rutina.

SIMPLE Y LOCAL
No necesitas una cuenta. Tus contadores de Foxiem, historial, perfil, recordatorios y preferencias se guardan en tu dispositivo. Las prácticas de publicidad y analítica se explican en la información de privacidad de la app.

Pequeños conteos. Gran progreso.`,
  },
  it: {
    title: 'Foxiem: Contatore multiplo',
    subtitle: 'Abitudini, serie e progressi',
    keywords: 'conteggio,clic,ripetizioni,punteggio,inventario,obiettivo,routine,persone,statistiche,giornaliero',
    promoText:
      'Ora con più contatori personalizzati: passa tra le attività e consulta statistiche, cronologia e serie per ogni contatore.',
    releaseNotes:
      'L’App Store mostra Foxiem in inglese, turco, tedesco, francese, spagnolo e italiano.',
    description: `Foxiem è un contatore multiplo semplice e rilassante per tutto ciò che vuoi contare: abitudini, ripetizioni in palestra, lettura, persone, punteggi, routine o attività quotidiane.

PIÙ CONTATORI
Dai un nome a ogni contatore e mantieni separate le diverse attività. Passa da un contatore all’altro da Home, Statistiche, Cronologia e Costanza.

CONTA VELOCEMENTE
Usa +1, +5 e -1 per registrare i progressi in pochi secondi. Reimposta il contatore attivo quando vuoi ricominciare.

VEDI I TUOI PROGRESSI
Consulta cronologia, statistiche giornaliere, settimanali e mensili e le serie del contatore selezionato.

MANTIENI LA COSTANZA
Crea promemoria locali nei giorni e negli orari più adatti alla tua routine.

SEMPLICE E LOCALE
Non serve un account. I contatori Foxiem, la cronologia, il profilo, i promemoria e le preferenze vengono archiviati sul dispositivo. Le pratiche relative a pubblicità e analisi sono descritte nelle informazioni sulla privacy dell’app.

Piccoli conteggi. Grandi progressi.`,
  },
};

const problems = [];
for (const [locale, item] of Object.entries(copy)) {
  if (item.title.length < 2 || item.title.length > 30) problems.push(`${locale} title ${item.title.length}`);
  if (item.subtitle.length > 30) problems.push(`${locale} subtitle ${item.subtitle.length}`);
  if (item.keywords.length > 100) problems.push(`${locale} keywords ${item.keywords.length}`);
  if (item.promoText.length > 170) problems.push(`${locale} promo ${item.promoText.length}`);
  if (item.description.length < 10 || item.description.length > 4000) {
    problems.push(`${locale} description ${item.description.length}`);
  }
  const info = config.apple.info[locale];
  if (!info) problems.push(`missing locale ${locale}`);
  else {
    info.title = item.title;
    info.subtitle = item.subtitle;
    info.keywords = item.keywords.split(',');
    info.promoText = item.promoText;
    info.description = item.description;
    info.releaseNotes = item.releaseNotes;
  }
  console.log(
    locale,
    'title',
    item.title.length,
    'subtitle',
    item.subtitle.length,
    'keywords',
    item.keywords.length,
    'promo',
    item.promoText.length,
    'desc',
    item.description.length,
  );
}

if (config.apple.info['ar-SA']) {
  config.apple.info['ar-SA'].title = copy['en-GB'].title;
  config.apple.info['ar-SA'].subtitle = copy['en-GB'].subtitle;
}

config.apple.categories = ['UTILITIES', 'PRODUCTIVITY'];

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

fs.writeFileSync('store.config.json', JSON.stringify(config, null, 2) + '\n');
console.log('updated store.config.json');
