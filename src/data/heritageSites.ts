import { HeritageSite, TourCity } from '../types';

export const TOUR_CITIES: TourCity[] = [
  {
    id: 'budapest',
    name: 'Budapest',
    country: 'Hungary',
    flagEmoji: '🇭🇺',
    subtitle: 'Great Synagogues, Theodor Herzl & Heroes of Sepharad and Ashkenaz',
    description: 'Explore Europe’s largest Jewish district, from Theodor Herzl’s birthplace to the poignant Shoes on the Danube Bank and Raoul Wallenberg’s rescue legacy.',
    centerLat: 47.4959,
    centerLng: 19.0606,
  },
  {
    id: 'vienna',
    name: 'Vienna',
    country: 'Austria',
    flagEmoji: '🇦🇹',
    subtitle: 'Stadttempel, Fin-de-Siècle Intellectuals & Modern Zionist Roots',
    description: 'Journey through imperial Vienna, discovering the hidden Stadttempel, Judenplatz Holocaust Memorial, and Theodor Herzl’s pivotal political transformation.',
    centerLat: 48.2115,
    centerLng: 16.3733,
  },
  {
    id: 'warsaw',
    name: 'Warsaw',
    country: 'Poland',
    flagEmoji: '🇵🇱',
    subtitle: '1,000 Years of Polish Jewry, Ghetto Heroes & Israel Bonds',
    description: 'Walk the sacred ground of POLIN Museum, the Warsaw Ghetto Uprising bunker at Miła 18, and honor Mordechai Anielewicz and Janusz Korczak.',
    centerLat: 52.2495,
    centerLng: 20.9930,
  },
  {
    id: 'prague',
    name: 'Prague',
    country: 'Czech Republic',
    flagEmoji: '🇨🇿',
    subtitle: 'The Maharal’s Golem, Old-New Synagogue & Kafka’s Mysticism',
    description: 'Immerse in the magical Josefov quarter, home to Europe’s oldest active synagogue, the legendary Golem attic, and Franz Kafka’s Hebrew studies.',
    centerLat: 50.0898,
    centerLng: 14.4185,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    flagEmoji: '🇬🇧',
    subtitle: 'Bevis Marks Sephardic Cathedral, Montefiore & Balfour Declaration',
    description: 'Discover 350 years of Anglo-Jewish history, from 1701 Bevis Marks to Sir Moses Montefiore’s Jerusalem vision and the site of the 1917 Balfour Declaration.',
    centerLat: 51.5145,
    centerLng: -0.0784,
  },
  {
    id: 'modiin',
    name: "Modi'in",
    country: 'Israel',
    flagEmoji: '🇮🇱',
    subtitle: 'Cradle of the Hasmoneans, Ancient Maccabean Graves & Heritage Museum',
    description: 'Step into the legendary birthplace of the Maccabean Revolt against the Seleucid Empire. Explore ancient Hasmonean fortresses, ancient synagogues, the Heritage Museum, and sacred burial sites in the Judaean foothills.',
    centerLat: 31.8988,
    centerLng: 35.0105,
  },
];

export const HERITAGE_SITES: HeritageSite[] = [
  // ==========================================
  // BUDAPEST TOUR STOPS (HUNGARY)
  // ==========================================
  {
    id: 'budapest-dohany-synagogue',
    cityId: 'budapest',
    cityName: 'Budapest',
    name: 'Dohány Street Synagogue (The Great Synagogue)',
    hebrewName: 'בית הכנסת הגדול של בודפשט (רחוב דוהאני)',
    category: 'synagogue',
    lat: 47.4959,
    lng: 19.0606,
    address: 'Dohány u. 2, 1074 Budapest, Hungary',
    shortDescription: 'The largest synagogue in Europe and second-largest in the world, a masterpiece of Moorish Revival architecture.',
    fullDescription: 'Built between 1854 and 1859 by Viennese architect Ludwig Förster, the Dohány Street Synagogue is a monumental symbol of Hungarian Jewish identity and resilience. Seating over 3,000 worshippers, its striking twin octagonal towers reach 44 meters into the skyline. During World War II, the synagogue complex was encircled by the boundary wall of the Budapest Ghetto, serving as a shelter, hospital, and tragic mass burial ground. Today, it stands restored as a thriving center of Jewish prayer, world music, and international pilgrimage.',
    audioDuration: 240,
    transcript: `Shalom and welcome to the majestic Dohány Street Synagogue, the beating heart of Hungarian Jewish history and the largest synagogue sanctuary in all of Europe.

As you look up at its red and yellow brick façade, take in the intricate Moorish Revival style, inspired by the Alhambra palace in Granada, Spain. The two imposing octagonal towers capped with onion domes symbolise the two pillars of Solomon’s Temple in Jerusalem—Jachin and Boaz.

Step back in time to September 1859, when this grand sanctuary was dedicated. It represented a golden era of assimilation and cultural flourishing for Neolog Hungarian Jewry. The interior features rich poly-chromatic geometric decoration, gilded chandeliers, and a magnificent 5,000-pipe organ once played by Franz Liszt and Camille Saint-Saëns.

However, these sacred grounds also carry profound sorrow. In November 1944, Nazi forces and Arrow Cross militiamen forcibly enclosed over 70,000 Jews within the surrounding Budapest Ghetto. The courtyard of this very synagogue became a temporary cemetery during the freezing winter of 1944–1945, where over 2,000 victims were laid to rest.

Today, the Dohány Street Synagogue stands as a triumphant testament to Jewish survival. It remains an active house of worship, hosting daily minyanim, festive high holidays, and international concerts celebrating Sephardic and Ashkenazic musical heritage.`,
    historicalPeriod: '1854–1859 (Moorish Revival Era)',
    imageUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    tags: ['Budapest', 'Great Synagogue', 'Moorish Revival', 'Holocaust History', 'Neolog'],
    keyFacts: [
      'Largest synagogue in Europe seating over 3,000 people',
      'Designed by Viennese architect Ludwig Förster with twin 44-meter towers',
      'Enclosed within the boundary of the Budapest Ghetto during 1944–1945'
    ]
  },
  {
    id: 'budapest-herzl-birthplace',
    cityId: 'budapest',
    cityName: 'Budapest',
    name: 'Theodor Herzl Birthplace & Jewish Museum',
    hebrewName: 'מקום הולדתו של בנימין זאב הרצל (מוזיאון היהודי)',
    category: 'scholar',
    lat: 47.4960,
    lng: 19.0601,
    address: 'Dohány u. 2 (Adjacent to Synagogue), 1074 Budapest',
    shortDescription: 'The exact birthplace of Theodor Herzl, father of modern political Zionism and visionary of the State of Israel.',
    fullDescription: 'Right on this historic corner, in a two-story residential house that previously stood attached to the Dohány Street Synagogue, Theodor (Binyamin Ze’ev) Herzl was born on May 2, 1860. Raised in an assimilated upper-middle-class German-Hungarian Jewish family, young Herzl celebrated his bar mitzvah here before moving to Vienna. Today, the site houses the Hungarian Jewish Museum, displaying priceless Judaica, medieval gravestones, and a dedicated wing commemorating Herzl’s journey from Budapest journalist to founder of the World Zionist Organization.',
    audioDuration: 255,
    transcript: `You are standing on one of the most significant coordinates in modern world history—the exact birthplace of Theodor Herzl, Binyamin Ze’ev, the father of modern political Zionism.

Born on May 2, 1860, in a house that stood right here, Herzl spent his childhood listening to the bells of Budapest and the prayers echoing from the adjacent Great Synagogue. His grandfather was a follower of the famous Sephardic Rabbi Judah Alkalai, an early advocate of Jewish return to Eretz Yisrael.

In his youth, Herzl was a passionate writer and student of law. It was later, while working as a Paris correspondent covering the infamous 1894 Dreyfus Affair, that Herzl witnessed mobs chanting "Death to the Jews!" in the streets of Paris. This shock transformed his worldview. He realized that neither assimilation nor enlightenment would guarantee Jewish safety in Europe.

In 1896, Herzl published his revolutionary manifesto "Der Judenstaat" (The Jewish State), writing prophetically: "If you will it, it is no dream." Just one year later, he convened the First Zionist Congress in Basel, Switzerland, establishing the World Zionist Organization. In his diary on September 3, 1897, Herzl penned words that still ring across history: "At Basel I founded the Jewish State. If I said this out loud today, I would be answered by universal laughter. Perhaps in five years, certainly in fifty, everyone will know it."

Fifty years later, in 1947, the United Nations voted for the creation of the Jewish State, and in 1948, the State of Israel declared its independence.`,
    historicalPeriod: '1860 (Birthplace of Modern Zionism)',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['Theodor Herzl', 'Zionism', 'State of Israel', 'Budapest', 'Museum'],
    keyFacts: [
      'Theodor Herzl was born on this exact plot on May 2, 1860',
      'Author of "Der Judenstaat" (1896) and founder of the World Zionist Congress',
      'Houses the Hungarian Jewish Museum featuring 11th-century Judaica artifacts'
    ]
  },
  {
    id: 'budapest-shoes-danube',
    cityId: 'budapest',
    cityName: 'Budapest',
    name: 'Shoes on the Danube Bank Memorial',
    hebrewName: 'אנדרטת הנעליים על עלדות הדנובה',
    category: 'monument',
    lat: 47.5039,
    lng: 19.0448,
    address: 'Id. Antall József rkp., 1054 Budapest, Hungary',
    shortDescription: 'Sixty pairs of period iron shoes memorializing thousands of Jewish victims shot into the river during winter 1944–1945.',
    fullDescription: 'Conceived by film director Can Togay and sculpted by Gyula Pauer in 2005, the Shoes on the Danube Bank is one of the world’s most poignant Holocaust memorials. Cast in solid iron and rusted by the river spray, sixty pairs of 1940s-style men’s, women’s, and children’s shoes sit directly at the water’s edge near the Hungarian Parliament. They honor the memory of up to 20,000 Hungarian Jews who were forced by fascists to strip off their shoes before being shot into the freezing Danube current.',
    audioDuration: 220,
    transcript: `Stand quietly beside the flowing waters of the Danube River and look down at these rusted iron shoes.

In the freezing, dark months between October 1944 and January 1945, fascists belonging to the Arrow Cross party terrorized the streets of Budapest. They rounded up innocent Jewish men, women, and children from safe houses and forced them to march to the riverbank.

Because shoes were valuable commodities during wartime, victims were commanded to unlace their boots and shoes, line them up on the stone embankment, and stand at the edge. Rifle shots rang out, and the freezing current swallowed their bodies.

Look closely at the sixty pairs of shoes sculpted here. Notice the small worn children’s shoes with tiny laces, the elegant women’s high heels, the sturdy work boots of craftsmen and scholars. Cast in heavy iron, they remain fixed in place, forever waiting for owners who never returned.

Iron plaques set into the pavement in Hungarian, English, and Hebrew read: "To the memory of the victims shot into the Danube by Arrow Cross militiamen in 1944–45." Visitors from Israel and around the world frequently place yahrzeit candles and small stones inside the iron shoes in eternal remembrance.`,
    historicalPeriod: 'Winter 1944–1945 (Holocaust Memorial)',
    imageUrl: 'https://images.unsplash.com/photo-1548625361-1851e39a3857?auto=format&fit=crop&w=800&q=80',
    tags: ['Danube', 'Memorial', 'Holocaust', 'Arrow Cross', 'Budapest'],
    keyFacts: [
      'Sculpted by Gyula Pauer and Can Togay in 2005 with 60 iron pairs of 1940s shoes',
      'Commemorates up to 20,000 Jews executed along the Danube banks',
      'Located directly in front of the Hungarian Parliament building'
    ]
  },
  {
    id: 'budapest-wallenberg-park',
    cityId: 'budapest',
    cityName: 'Budapest',
    name: 'Raoul Wallenberg Memorial Park & Emmanuel Tree of Life',
    hebrewName: 'פארק זיכרון ראול ולנברג ועץ החיים',
    category: 'monument',
    lat: 47.4963,
    lng: 19.0612,
    address: 'Dohány Synagogue Courtyard, 1074 Budapest',
    shortDescription: 'The silver weeping willow Tree of Life commemorating Righteous Among the Nations and Holocaust victims.',
    fullDescription: 'Located in the rear courtyard of the Great Synagogue, the Raoul Wallenberg Memorial Park features Imre Varga’s famous metal sculpture—a weeping willow tree made of shining stainless steel. Each of its thousands of metallic leaves is engraved with the name of a Hungarian Jewish victim. The park also honors diplomats like Swedish envoy Raoul Wallenberg and Swiss consul Carl Lutz, who issued protective passports saving over 100,000 lives.',
    audioDuration: 210,
    transcript: `Welcome to the serene Raoul Wallenberg Memorial Park, dedicated to courage, sacrifice, and the Righteous Among the Nations.

At the center of the courtyard stands Imre Varga’s striking stainless-steel weeping willow tree, known as the Emmanuel Tree of Life. Funded in part by the actor Tony Curtis in memory of his father, Emanuel Schwartz, who emigrated from Hungary, this tree bears thousands of metallic silver leaves. Step closer and you will see individual names carefully etched into each leaf—each representing an innocent soul lost in the Holocaust.

Surrounding the tree are red granite pillars honoring non-Jewish heroes who risked their own lives to save others. Most prominent among them is Raoul Wallenberg, the Swedish diplomat who arrived in Budapest in July 1944. Wallenberg designed yellow protective passports—the Schutz-Pass—and purchased dozens of apartment buildings across Budapest, declaring them Swedish diplomatic territory to shelter tens of thousands of Jews.

Beside Wallenberg stands the memory of Carl Lutz, the Swiss diplomat who established the "Glass House" shelter, saving over 60,000 people. Both Wallenberg and Lutz are honored at Yad Vashem in Jerusalem as Righteous Among the Nations, exemplifying the Talmudic verse: "Whoever saves a single life, it is as if he saved an entire world."`,
    historicalPeriod: '1944–1945 (Righteous Rescuers)',
    imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
    tags: ['Raoul Wallenberg', 'Tree of Life', 'Yad Vashem', 'Righteous Among the Nations'],
    keyFacts: [
      'Silver weeping willow sculpture by Imre Varga with thousands of etched victim names',
      'Honors Swedish diplomat Raoul Wallenberg who saved over 100,000 Jews',
      'Includes memorials to Carl Lutz, Giorgio Perlasca, and Angel Sanz Briz'
    ]
  },
  {
    id: 'budapest-kazinczy-synagogue',
    cityId: 'budapest',
    cityName: 'Budapest',
    name: 'Kazinczy Street Orthodox Synagogue & Kosher District',
    hebrewName: 'בית הכנסת האורתודוקסי ברחוב קאזינצי',
    category: 'synagogue',
    lat: 47.4981,
    lng: 19.0631,
    address: 'Kazinczy u. 29-31, 1075 Budapest, Hungary',
    shortDescription: 'The vibrant center of Budapest’s Orthodox Jewish community, featuring Hungarian Art Nouveau synagogue design.',
    fullDescription: 'Designed by brothers Béla and Sándor Löffler and inaugurated in 1913, the Kazinczy Street Synagogue is the spiritual home of Budapest’s Autonomous Orthodox Jewish Community. Built in Jugendstil / Art Nouveau style with asymmetric brickwork and stained-glass windows produced by Miksa Róth, the complex houses a glatt kosher restaurant, a traditional mikveh, a talmud torah school, and a vibrant community center connecting local residents with Israeli visitors.',
    audioDuration: 195,
    transcript: `Welcome to Kazinczy Street, the bustling heart of Budapest’s Orthodox Jewish Quarter.

Unlike the Neolog Dohány Street Synagogue, the Kazinczy Street Synagogue was built in 1913 specifically for the strictly observant Orthodox community. Architects Béla and Sándor Löffler blended traditional Jewish requirements with cutting-edge Hungarian Art Nouveau design.

Look at the façade: it features brick-faced geometric patterns, a carved stone inscription of the Ten Commandments above the roofline, and vibrant stained-glass windows designed by master glassmaker Miksa Róth. Inside, the sanctuary features a central bimah and a ceiling illuminated by stained-glass skylights shaped like stars of David.

As you walk down Kazinczy Street today, you will smell fresh challah baking in the morning and kosher falafel in the afternoon. The neighborhood has undergone an extraordinary revival, blending historic kosher butcher shops, community mikvaot, and modern Israeli-Hungarian eateries where Hebrew, Hungarian, and Yiddish can all be heard.`,
    historicalPeriod: '1913 (Art Nouveau Era)',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    tags: ['Kazinczy', 'Orthodox', 'Art Nouveau', 'Kosher Quarter', 'Budapest'],
    keyFacts: [
      'Inaugurated in 1913 in unique Hungarian Jugendstil / Art Nouveau style',
      'Home to the active Autonomous Orthodox Community of Budapest',
      'Features Miksa Róth stained glass windows and central traditional Bimah'
    ]
  },

  // ==========================================
  // VIENNA TOUR STOPS (AUSTRIA)
  // ==========================================
  {
    id: 'vienna-stadttempel',
    cityId: 'vienna',
    cityName: 'Vienna',
    name: 'Stadttempel (Vienna City Synagogue)',
    hebrewName: 'בית הכנסת המרכזי של וינה (שטאדטטמפל)',
    category: 'synagogue',
    lat: 48.2115,
    lng: 16.3733,
    address: 'Seitenstettengasse 4, 1010 Wien, Austria',
    shortDescription: 'The principal synagogue of Vienna and the only historic synagogue in the city to survive Kristallnacht in 1938.',
    fullDescription: 'Designed by renowned architect Joseph Kornhäusel and dedicated in 1826, the Stadttempel is an architectural marvel hidden behind an unassuming residential apartment building facade due to Edict of Tolerance regulations. Featuring an oval neoclassical interior crowned by a sky-blue dome with gilded stars, it was the synagogue where cantor Salomon Sulzer revolutionized Jewish liturgical music. Theodor Herzl sat in pew number 82 here. It survived Kristallnacht because burning it would have destroyed adjacent residential blocks.',
    audioDuration: 240,
    transcript: `Shalom and welcome to Seitenstettengasse in the heart of historic Vienna. Standing before number 4, you might be surprised that you cannot see a grand synagogue from the street.

During the reign of Emperor Joseph II, the Edict of Tolerance dictated that non-Catholic houses of worship could not display public facades facing the street. Architect Joseph Kornhäusel ingeniously designed a four-story apartment building facing the street, concealing one of Europe’s most magnificent neoclassical synagogue interiors within.

When you pass through the entrance into the oval sanctuary, you are surrounded by twelve elegant Ionic pillars supporting a sky-blue dome painted with gold stars. It was here that chief cantor Salomon Sulzer collaborated with Franz Schubert to compose timeless choral settings for Friday night services that spread across synagogues worldwide.

In this very sanctuary, Theodor Herzl sat in pew 82 during his years in Vienna. On November 9, 1938, during the horror of Kristallnacht, Nazi mobs set fire to all 93 synagogues and prayer halls across Vienna. The Stadttempel alone survived structural destruction because its hidden location inside a residential block meant setting it ablaze would burn down the entire neighborhood.

Today, the Stadttempel is the proud headquarters of the Israelitische Kultusgemeinde Wien, serving as the spiritual heart of Austrian Jewry and a beacon of Jewish continuity.`,
    historicalPeriod: '1826 (Neoclassical Era)',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    tags: ['Vienna', 'Stadttempel', 'Salomon Sulzer', 'Kristallnacht Survivor', 'Neoclassical'],
    keyFacts: [
      'Dedicated in 1826, the only historic synagogue in Vienna to survive Kristallnacht',
      'Concealed behind a residential building due to 18th-century Austrian imperial laws',
      'Theodor Herzl prayed in pew 82 during his years in Vienna'
    ]
  },
  {
    id: 'vienna-judenplatz',
    cityId: 'vienna',
    cityName: 'Vienna',
    name: 'Judenplatz Holocaust Memorial & Medieval Synagogue',
    hebrewName: 'כיכר היהודים (יודנפלאץ) ואנדרטת הספרייה ההפוכה',
    category: 'monument',
    lat: 48.2116,
    lng: 16.3697,
    address: 'Judenplatz, 1010 Wien, Austria',
    shortDescription: 'Rachel Whiteread’s inverted concrete library memorial set above subterranean medieval synagogue ruins.',
    fullDescription: 'Judenplatz has been the center of Viennese Jewish life since the 12th century. At its center stands British artist Rachel Whiteread’s "Nameless Library" memorial, unveiled in 2000. Cast in solid white concrete, the sculpture resembles a library with thousands of book spines turned inward—symbolizing the unwritten stories of 65,000 Austrian Holocaust victims. Beneath the square lie the excavated foundations of the 14th-century medieval synagogue destroyed during the 1421 Vienna Gesera persecution.',
    audioDuration: 230,
    transcript: `Stand in the quiet center of Judenplatz, a stone square that has witnessed over 800 years of Viennese Jewish history.

Before you stands Rachel Whiteread’s haunting "Nameless Library" memorial, dedicated to the 65,000 Austrian Jews murdered during the Holocaust. Notice the architecture: the structure looks like a solid cube lined with thousands of thick hardcover books, but every book is turned backwards, displaying blank page edges rather than titles. The heavy cast-concrete doors are permanently shut without handles.

This design honors the "People of the Book," while symbolizing the lost wisdom, poetry, and stories stolen from the world. Engraved around the base are the names of the concentration camps where Austrian Jews were deported—including Mauthausen, Auschwitz, Treblinka, and Sobibor.

Look down at the cobblestones beneath your feet. Directly below this memorial lie the preserved stone foundations of the medieval Great Synagogue of Vienna, which was burnt during the tragic Vienna Gesera pogrom of 1421. Nearby stands the statue of Enlightenment poet Gotthold Ephraim Lessing, author of "Nathan the Wise," reminding us of the eternal quest for religious tolerance and human dignity.`,
    historicalPeriod: '12th Century to Present (Medieval & Holocaust History)',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    tags: ['Judenplatz', 'Nameless Library', 'Rachel Whiteread', 'Vienna', 'Medieval Synagogue'],
    keyFacts: [
      'Unveiled in 2000, designed by British sculptor Rachel Whiteread',
      'Constructed as an inverted library with thousands of reversed book spines',
      'Sits directly above the excavated 14th-century medieval synagogue ruins'
    ]
  },
  {
    id: 'vienna-herzl-residence',
    cityId: 'vienna',
    cityName: 'Vienna',
    name: 'Theodor Herzl Vienna Legacy & Berggasse Precinct',
    hebrewName: 'מורשת הרצל בוינה וסביבת ברגאסה',
    category: 'scholar',
    lat: 48.2173,
    lng: 16.3630,
    address: 'Berggasse 6 & Liechtensteinstraße, 1090 Wien',
    shortDescription: 'The neighborhood where Theodor Herzl lived as literary editor of the Neue Freie Presse while shaping political Zionism.',
    fullDescription: 'In this elegant 9th district neighborhood, Theodor Herzl resided during his transformative years as the prominent literary editor (Feuilleton editor) for Vienna’s leading newspaper, the *Neue Freie Presse*. Just around the corner from Sigmund Freud’s residence on Berggasse 19, Herzl conducted intense diplomatic correspondence with European monarchs, Ottoman officials, and Jewish philanthropists, organizing the First Zionist Congress and articulating the vision of Jewish statehood.',
    audioDuration: 210,
    transcript: `Welcome to Vienna’s 9th district, an intellectual hub where modern psychology and political Zionism developed side by side in the late 19th century.

It was here, while living at Liechtensteinstraße and working just a short walk away, that Theodor Herzl served as the prestigious Feuilleton editor for the *Neue Freie Presse*. Herzl was one of Vienna’s most famous literary figures, admired for his elegant essays and plays.

Yet, despite his professional success, Herzl watched with deep anxiety as anti-Semitic mayor Karl Lueger rose to power in Vienna, capitalizing on populist hatred. Herzl recognized that cultural acceptance in Europe was fragile and conditional.

Working late into the night in his study in this district, Herzl composed his visionary book "Old New Land" (*Altneuland*), describing a flourishing, technologically advanced democratic Jewish society in Eretz Yisrael where Hebrew and European languages would flourish under the slogan: "If you will it, it is no dream."

Herzl’s remains were initially buried in Vienna’s Döbling cemetery in 1904. In August 1949, following the establishing of the State of Israel, his body was brought to Jerusalem and reinterred with state honors atop Mount Herzl, fulfilling his explicit testament.`,
    historicalPeriod: '1890–1904 (Zionist Founding Era)',
    imageUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    tags: ['Theodor Herzl', 'Vienna', 'Altneuland', 'Zionism', 'Mount Herzl'],
    keyFacts: [
      'Herzl worked here as literary editor of the Neue Freie Presse',
      'Wrote his utopian Zionist novel "Altneuland" (Old New Land) in Vienna',
      'Herzl’s remains were reinterred on Mount Herzl in Jerusalem in 1949'
    ]
  },
  {
    id: 'vienna-jewish-museum',
    cityId: 'vienna',
    cityName: 'Vienna',
    name: 'Jewish Museum Vienna (Palais Eskeles)',
    hebrewName: 'המוזיאון היהודי של וינה (פלאה אשקלס)',
    category: 'scholar',
    lat: 48.2065,
    lng: 16.3692,
    address: 'Dorotheergasse 11, 1010 Wien, Austria',
    shortDescription: 'The historic Palais Eskeles housing 800 years of Viennese Jewish cultural, intellectual, and community history.',
    fullDescription: 'Established in 1895 as the world’s very first Jewish museum, the Jewish Museum Vienna is housed in the stately 15th-century Palais Eskeles on Dorotheergasse. It documents the immense contributions of Viennese Jewish figures—including Gustav Mahler, Arnold Schoenberg, Sigmund Freud, Stefan Zweig, and Lise Meitner—while showcasing fine ceremonial Judaica and engaging exhibits on contemporary Israeli-Austrian ties.',
    audioDuration: 190,
    transcript: `Step inside Palais Eskeles on Dorotheergasse, home to the Jewish Museum Vienna—originally founded in 1895 as the world’s very first dedicated Jewish museum.

This historic palace once belonged to Baron Bernhard von Eskeles, a prominent Jewish banker who co-founded the Austrian National Bank in 1816. His salon was a meeting ground for composers like Ludwig van Beethoven and political leaders across Europe.

Inside the museum’s visible storage display, over 2,000 ceremonial objects, silver Hanukkah menorahs, embroidered Torah mantles, and silver crowns illustrate the vibrant ritual life of Viennese Jewry across centuries. Special exhibitions explore the fin-de-siècle explosion of Jewish creativity in Vienna, when Jewish thinkers transformed medicine, psychoanalysis, literature, music, and art.

The museum also chronicles the rebirth of Vienna’s Jewish community after 1945, highlighting the strong cultural, academic, and diplomatic bonds between modern Austria and the State of Israel.`,
    historicalPeriod: '1895 to Present',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['Jewish Museum', 'Palais Eskeles', 'Vienna', 'Judaica', 'Culture'],
    keyFacts: [
      'First Jewish museum in the world, founded in Vienna in 1895',
      'Housed in the historic 15th-century palace of banker Baron Eskeles',
      'Features over 2,000 ceremonial Judaica artifacts and historical archives'
    ]
  },
  {
    id: 'vienna-morzinplatz',
    cityId: 'vienna',
    cityName: 'Vienna',
    name: 'Morzinplatz Gestapo Memorial & Aliyah Bet Route',
    hebrewName: 'אנדרטת מורצינפלאץ ונתיב העלייה ב\'',
    category: 'monument',
    lat: 48.2133,
    lng: 16.3742,
    address: 'Morzinplatz, 1010 Wien, Austria',
    shortDescription: 'Memorial on the Danube Canal marking the site of the former Gestapo headquarters and underground escape routes to Palestine.',
    fullDescription: 'Morzinplatz was the site of the luxurious Hotel Métropole, which was seized by the SS in March 1938 and converted into the notorious headquarters of the Gestapo in Vienna. Tens of thousands of victims were interrogated and tortured here before deportation. Following the war, Morzinplatz also became a key transit point for post-war Jewish refugees and Mossad LeAliyah Bet underground networks assisting Holocaust survivors on their perilous journey toward Mandate Palestine and the founding of Israel.',
    audioDuration: 200,
    transcript: `Standing near the Danube Canal at Morzinplatz, you are looking at a place etched with both dark oppression and courageous liberation.

Where this park stands today, the grand Hotel Métropole once dominated the square. Immediately following the Nazi annexation (*Anschluss*) of Austria in March 1938, the Gestapo confiscated the hotel, making it their largest operational headquarters outside Berlin with over 500 officials.

Thousands of Austrian Jews, political dissidents, and resistance fighters were dragged into the basement interrogation rooms here. Among those imprisoned here was Baron Louis de Rothschild, who was held for ransom before escaping abroad.

After the war, the ruined hotel was demolished, and a memorial stone carved from Mauthausen granite was erected here in 1951. During the late 1940s, Vienna and Morzinplatz became crucial waystations for Brichah and Mossad LeAliyah Bet—the underground clandestine movement that organized thousands of Jewish survivors crossing European borders to board ships heading to the Land of Israel.`,
    historicalPeriod: '1938–1948 (Resistance & Aliyah Bet)',
    imageUrl: 'https://images.unsplash.com/photo-1548625361-1851e39a3857?auto=format&fit=crop&w=800&q=80',
    tags: ['Morzinplatz', 'Gestapo Memorial', 'Aliyah Bet', 'Brichah', 'Vienna'],
    keyFacts: [
      'Site of Gestapo headquarters in Hotel Métropole from 1938 to 1945',
      'Granite memorial stone erected from the Mauthausen quarry',
      'Key transit point for Mossad LeAliyah Bet underground survivor routes to Israel'
    ]
  },

  // ==========================================
  // WARSAW TOUR STOPS (POLAND)
  // ==========================================
  {
    id: 'warsaw-polin-museum',
    cityId: 'warsaw',
    cityName: 'Warsaw',
    name: 'POLIN Museum of the History of Polish Jews',
    hebrewName: 'מוזיאון פולין לתולדות יהודי פולין',
    category: 'scholar',
    lat: 52.2495,
    lng: 20.9930,
    address: 'Anielewicza 6, 00-157 Warszawa, Poland',
    shortDescription: 'World-renowned museum built on the site of the Warsaw Ghetto, celebrating 1,000 years of Polish Jewish heritage.',
    fullDescription: 'Designed by Finnish architect Rainer Mahlamäki, POLIN Museum opened in 2013 on the site of the Warsaw Ghetto, directly facing the Monument to the Ghetto Heroes. The word "Po-lin" in Hebrew means "here rest" or "dwell here," reflecting the legend of medieval Jewish travelers finding peace in Poland. Its core exhibition takes visitors on an immersive journey across 1,000 years—from early trade charters to Yiddish theater, Hasidism, the catastrophe of the Holocaust, and the flourishing rebirth of Jewish life and Israeli-Polish partnership.',
    audioDuration: 250,
    transcript: `Shalom and welcome to POLIN Museum of the History of Polish Jews, an architectural and cultural wonder standing in the heart of Muranów, the historic Jewish district of Warsaw.

Look at the museum building: its glass facade is sliced open by a dramatic, undulating chasm of warm limestone. Architect Rainer Mahlamäki designed this opening to evoke the parting of the Red Sea during the Exodus, symbolizing passage, memory, and hope.

Before World War II, Poland was home to 3.3 million Jews—the largest Jewish community in Europe and the second-largest in the world after New York. Warsaw alone was a bustling metropolis where one out of every three residents was Jewish. Hebrew and Yiddish newspapers flourished, rabbinical academies flourished, and political movements like Zionism and the Bund took deep root.

Inside POLIN’s gallery spaces, walk beneath a breathtaking full-scale reconstruction of the hand-painted 17th-century wooden synagogue of Gwoździec. Discover how Polish Jews contributed to literature, science, and the early pioneers who emigrated to Palestine to build the cities and kibbutzim of modern Israel.

POLIN is not only a monument to memory; it is a living center of education hosting thousands of students, Israeli youth delegations, and international visitors every year.`,
    historicalPeriod: '1,000 Years of Heritage to Present',
    imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
    tags: ['POLIN', 'Warsaw', 'Polish Jewry', 'Museum', 'Muranów'],
    keyFacts: [
      'Built directly on the site of the pre-war Warsaw Ghetto',
      'Features a hand-painted reconstruction of the 17th-century Gwoździec wooden synagogue',
      'Awarded European Museum of the Year in 2016'
    ]
  },
  {
    id: 'warsaw-ghetto-heroes',
    cityId: 'warsaw',
    cityName: 'Warsaw',
    name: 'Monument to the Warsaw Ghetto Heroes (Rapoport)',
    hebrewName: 'אנדרטת גיבורי גטו ורשה (נתן רפופורט)',
    category: 'monument',
    lat: 52.2498,
    lng: 20.9935,
    address: 'Zamenhofa & Anielewicza, 00-153 Warszawa, Poland',
    shortDescription: 'Nathan Rapoport’s iconic bronze sculpture honoring the heroic 1943 Warsaw Ghetto Uprising led by ŻOB.',
    fullDescription: 'Unveiled on April 19, 1948—the 5th anniversary of the Warsaw Ghetto Uprising—Nathan Rapoport’s monument is carved from labradorite granite blocks ordered by Nazi architect Albert Speer for a triumph monument that was never built. The western relief shows young combatants wielding grenades and rifles led by Mordechai Anielewicz, while the eastern relief depicts the tragic march of Jewish men, women, and children toward deportation.',
    audioDuration: 240,
    transcript: `Stand before Nathan Rapoport’s Monument to the Warsaw Ghetto Heroes, one of the most sacred symbols of Jewish courage and resistance in human history.

Look at the dark granite wall behind the bronze figures. In an extraordinary twist of historical irony, these massive stone blocks were originally quarried in Sweden by order of Hitler’s architect Albert Speer to build a victory monument in Berlin. Instead, they form the wall honoring those who stood against Nazi tyranny.

On April 19, 1943—the eve of Passover—SS troops entered the Warsaw Ghetto expecting to liquidate the remaining 60,000 starving residents in a single day. Instead, they were met by intense gunfire, Molotov cocktails, and grenades. A few hundred young fighters belonging to the Jewish Fighting Organization (ŻOB) led by 24-year-old Mordechai Anielewicz, and the Jewish Military Union (ŻZW), fought back with astonishing heroism for nearly a month—longer than entire European nations resisted Nazi invasion.

Look at the central figure on the western side: Mordechai Anielewicz holds a grenade, his eyes fixed with unflinching determination. Next to him, young men and women clutch pistols and rifles, refusing to surrender.

This monument is the ceremonial center for Israel’s official Yom HaShoah (Holocaust Remembrance Day) ceremonies, where IDF officers, Israeli Prime Ministers, and youth groups gather to vow: "Never Again."`,
    historicalPeriod: 'April 19, 1943 (Warsaw Ghetto Uprising)',
    imageUrl: 'https://images.unsplash.com/photo-1548625361-1851e39a3857?auto=format&fit=crop&w=800&q=80',
    tags: ['Warsaw Ghetto Uprising', 'Mordechai Anielewicz', 'ŻOB', 'Rapoport Monument', 'Israel'],
    keyFacts: [
      'Unveiled on April 19, 1948, sculpted by Warsaw-born Nathan Rapoport',
      'Carved from Swedish granite ordered by Hitler for a Nazi victory arch',
      'Honors the 1943 Jewish Uprising that resisted SS forces for nearly a month'
    ]
  },
  {
    id: 'warsaw-mila-18',
    cityId: 'warsaw',
    cityName: 'Warsaw',
    name: 'Miła 18 Bunker Memorial (Mordechai Anielewicz Command Post)',
    hebrewName: 'אנדרטת בונקר מילא 18 (מפקדת מורדכי אנילביץ\')',
    category: 'monument',
    lat: 52.2519,
    lng: 20.9912,
    address: 'Ulica Miła 18, 00-180 Warszawa, Poland',
    shortDescription: 'The underground bunker where Mordechai Anielewicz and ŻOB fighters made their heroic final stand on May 8, 1943.',
    fullDescription: 'A earthen mound built over the collapsed underground bunker at Miła 18 marks the final command post of the Jewish Fighting Organization (ŻOB). Surrounded by German forces who pumped poison gas into the air shafts on May 8, 1943, commander Mordechai Anielewicz, his partner Mira Fuchrer, and over 100 resistance fighters chose to die rather than fall into enemy hands. Their memory is honored at Kibbutz Yad Mordechai in Israel.',
    audioDuration: 225,
    transcript: `You are standing on top of the earthen mound at Miła 18, one of the most hallowed burial sites of the Jewish resistance.

In the spring of 1943, beneath the ruins of the apartment building that once stood here, lay a massive underground bunker equipped with water, electricity, weapons, and six concealed entrances. It served as the central command post for Mordechai Anielewicz and the leadership of ŻOB.

For three weeks, Anielewicz directed guerrilla operations from this subterranean sanctuary. On April 23, 1943, Anielewicz wrote his famous final letter to his deputy Yitzhak Zuckerman ("Antek"): "My life’s dream has come true: I have lived to see Jewish self-defense in the Warsaw Ghetto in all its greatness and glory."

On May 8, 1943, German troops discovered the bunker entrances and threw gas canisters inside. Refusing to surrender, Anielewicz and over 100 comrades perished inside. Their bodies remain buried in the earth beneath this mound.

A memorial stone placed here in 2006 bears the names of 51 identified fighters, surrounded by the words of Psalms. In Israel, Kibbutz Yad Mordechai near Ashkelon was founded in his memory, where a famous bronze statue of Anielewicz holding a grenade stands overlooking the Judean hills.`,
    historicalPeriod: 'May 8, 1943 (Final Stand of ŻOB)',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    tags: ['Miła 18', 'Mordechai Anielewicz', 'ŻOB', 'Yad Mordechai', 'Warsaw'],
    keyFacts: [
      'Subterranean command bunker of the Jewish Fighting Organization (ŻOB)',
      'Site of final stand on May 8, 1943 where Anielewicz and 100+ fighters fell',
      'Direct link to Israel’s Kibbutz Yad Mordechai named in his honor'
    ]
  },
  {
    id: 'warsaw-nozyk-synagogue',
    cityId: 'warsaw',
    cityName: 'Warsaw',
    name: 'Nożyk Synagogue (Sole Surviving Pre-War Synagogue)',
    hebrewName: 'בית הכנסת נוז\'יק (בית הכנסת השורד היחיד בוורשה)',
    category: 'synagogue',
    lat: 52.2355,
    lng: 21.0022,
    address: 'Twarda 6, 00-105 Warszawa, Poland',
    shortDescription: 'The only pre-war synagogue in Warsaw that survived World War II, fully restored and active today.',
    fullDescription: 'Financed by merchant Zalman Nożyk and his wife Ryfka and dedicated in 1902, Nożyk Synagogue is a beautiful Neo-Romanesque house of worship with Byzantine motifs. Before 1939, Warsaw contained over 400 synagogues and prayer halls. Nożyk Synagogue survived total destruction because Nazi forces used its high-ceilinged interior as a horse stable and feed warehouse. Restored in the 1980s, it serves as the main synagogue of Warsaw, welcoming Israeli ambassadors, international visitors, and daily prayer services.',
    audioDuration: 200,
    transcript: `Welcome to Twarda Street and the beautiful Nożyk Synagogue, a miraculous survivor of wartime destruction.

Before 1939, Warsaw was home to over 400 synagogues, prayer houses, and Hasidic shtiesbles. When World War II ended, only one single standalone synagogue remained standing in the entire city—Nożyk Synagogue.

Built between 1898 and 1902 by wealthy dry-goods merchant Zalman Nożyk, this synagogue features Neo-Romanesque arches, elegant wrought-iron gallery railings, and a gilded Aron HaKodesh (Holy Ark).

During the occupation, the building was situated within the "Small Ghetto." After the ghetto liquidation, Nazi forces converted the sacred sanctuary into a stable for army horses and fodder storage. Although damaged during the 1944 Warsaw Uprising, the main structure survived intact.

Reopened and re-consecrated, Nożyk Synagogue today is the thriving spiritual center of Warsaw’s Jewish community. It hosts daily minyanim, Shabbat dinners, Jewish festivals, and official visits from Israeli heads of state and international diplomats.`,
    historicalPeriod: '1902 (Neo-Romanesque Architecture)',
    imageUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    tags: ['Nożyk Synagogue', 'Warsaw', 'Pre-War Heritage', 'Active Synagogue'],
    keyFacts: [
      'Built in 1902, the sole surviving pre-war synagogue out of 400+ in Warsaw',
      'Desecrated as a German military horse stable during WWII',
      'Active main synagogue hosting Warsaw’s Jewish community and Israeli delegations'
    ]
  },
  {
    id: 'warsaw-janusz-korczak',
    cityId: 'warsaw',
    cityName: 'Warsaw',
    name: 'Janusz Korczak Monument & Dom Sierot Orphanage',
    hebrewName: 'אנדרטת יאנוש קורצ\'אק ובית היתומים (דום שיירוט)',
    category: 'scholar',
    lat: 52.2380,
    lng: 20.9880,
    address: 'Jaktorowska 6 / Świętokrzyski Park, Warszawa',
    shortDescription: 'Honoring Dr. Janusz Korczak, the legendary educator and author who refused safety to march with his 200 orphans.',
    fullDescription: 'Dr. Janusz Korczak (born Henryk Goldszmit) was a visionary Jewish doctor, author, and pioneer of children’s rights who ran the Dom Sierot Jewish orphanage in Warsaw. He established a democratic children’s republic with its own court and newspaper. In August 1942, when Nazi forces ordered the deportation of his 200 orphans to Treblinka, Korczak refused offers of personal sanctuary, holding his children’s hands as they marched together to the Umschlagplatz with head held high.',
    audioDuration: 235,
    transcript: `Stand before this moving monument dedicated to Dr. Janusz Korczak—Henryk Goldszmit—one of history’s greatest humanitarians.

Born in Warsaw in 1878, Korczak was a renowned pediatrician, radio presenter, and beloved author of children’s books like "King Matt the First." In 1912, he founded the Dom Sierot Jewish orphanage at Jaktorowska Street, introducing a revolutionary philosophy of child education based on absolute respect, self-governance, and a children’s court where children judged their own peer grievances fairly.

Korczak visited Eretz Yisrael twice in the 1930s, visiting kibbutzim like Ein Harod and dreaming of establishing a progressive educational home in Palestine.

On August 5, 1942, during the mass deportation from the Warsaw Ghetto, SS guards arrived at the orphanage. Polish friends offered Korczak forged identity papers and safe escape to the Gentile side of Warsaw. Korczak steadfastly refused to abandon his children.

Eye-witnesses recorded the unforgettable sight: Korczak walking at the front of a column of 200 clean, neatly dressed children carrying the green flag of the orphanage, holding the youngest children in his arms as they marched to the train cars bound for Treblinka.

Today, Korczak’s educational principles are taught across Israeli teachers’ colleges, and his legacy is honored at Yad Vashem in Jerusalem with a famous bronze statue of Korczak embracing his children.`,
    historicalPeriod: '1878–1942 (Pioneer of Children’s Rights)',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['Janusz Korczak', 'Dom Sierot', 'Children’s Rights', 'Treblinka', 'Yad Vashem'],
    keyFacts: [
      'Pioneered democratic children’s rights and self-governing orphanages',
      'Refused safety offers and accompanied 200 orphans to Treblinka in August 1942',
      'Visits to Mandate Palestine influenced Israeli early education philosophy'
    ]
  },

  // ==========================================
  // PRAGUE TOUR STOPS (CZECH REPUBLIC)
  // ==========================================
  {
    id: 'prague-old-new-synagogue',
    cityId: 'prague',
    cityName: 'Prague',
    name: 'Old-New Synagogue (Staronová Synagóga) & The Golem Attic',
    hebrewName: 'בית הכנסת אלטנוישול והגולם מפראג',
    category: 'synagogue',
    lat: 50.0898,
    lng: 14.4185,
    address: 'Maiselova 18, 110 00 Josefov, Praha 1, Czechia',
    shortDescription: 'Europe’s oldest active synagogue (c. 1270) and legendary home of the Golem of Prague created by the Maharal.',
    fullDescription: 'Completed around 1270 in early Gothic style, the Old-New Synagogue (Altneuschul) is the oldest active synagogue in Europe. Featuring double-naved ribbed vaulting, medieval ironwork, and a high seat kept permanently vacant in memory of Chief Rabbi Judah Loew ben Bezalel (the Maharal of Prague), its attic is the legendary resting place of the Golem—the clay creature brought to life by the Maharal using Holy Names to defend Prague’s Jews.',
    audioDuration: 250,
    transcript: `Shalom and welcome to Josefov, Prague’s world-famous Jewish Quarter. You are standing before the Old-New Synagogue—the Altneuschul—the oldest active synagogue in all of Europe.

Step down two stone steps to enter the sanctuary. Building the floor below street level followed ancient tradition based on Psalm 130: "Out of the depths I cry to You, O Lord." The interior features five-ribbed Gothic vaulting, built by medieval stone masons so that the ribs would never form a Christian cross.

Look at the elevated seat near the Holy Ark: this was the high seat of Rabbi Judah Loew ben Bezalel, known reverently as the Maharal of Prague (1512–1609). The Maharal was a supreme Talmudic authority, kabbalist, mathematician, and friend of astronomer Tycho Brahe.

According to famous Prague legend, during a time of anti-Semitic persecution in the 16th century, the Maharal went down to the banks of the Vltava River at midnight. Molding river clay into human form, he inscribed secret Holy Names of God and the word *EMET* (Truth) on its forehead, breathing life into the Golem of Prague. The Golem protected the Jewish ghetto from harm until its power was safely deactivated. Legend holds that the remains of the clay Golem still slumber quietly up in the locked attic of this very synagogue.`,
    historicalPeriod: 'c. 1270 (Early Gothic & Golem Legend)',
    imageUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    tags: ['Prague', 'Altneuschul', 'Maharal', 'Golem', 'Gothic Synagogue'],
    keyFacts: [
      'Completed c. 1270, the oldest continuously active synagogue in Europe',
      'Home of the Maharal of Prague (Rabbi Judah Loew) and legendary Golem attic',
      'Features unique 5-rib Gothic vaulting and 16th-century historical flags'
    ]
  },
  {
    id: 'prague-old-cemetery',
    cityId: 'prague',
    cityName: 'Prague',
    name: 'Old Jewish Cemetery of Prague & Tomb of Maharal',
    hebrewName: 'בית העלמין היהודי העתיק בפראג וקבר המהר"ל',
    category: 'cemetery',
    lat: 50.0894,
    lng: 14.4169,
    address: 'Široká 3, 110 00 Josefov, Praha 1, Czechia',
    shortDescription: 'One of the oldest surviving Jewish burial grounds with 12,000 visible gravestones layered 12 levels deep.',
    fullDescription: 'In use from the early 15th century until 1787, the Old Jewish Cemetery of Prague contains over 12,000 visible gravestones crammed into a dense stone forest, with an estimated 100,000 burials stacked up to 12 layers deep due to spatial constraints imposed on the medieval ghetto. Its most revered tomb is that of Rabbi Judah Loew (the Maharal), where pilgrims from Israel and around the globe place handwritten prayer notes (kvitlach).',
    audioDuration: 230,
    transcript: `Step onto the raised paths of the Old Jewish Cemetery of Prague, a place of extraordinary spiritual density and historical memory.

Because medieval laws prohibited expanding the boundaries of the Jewish ghetto, the community was forced to add new layers of earth over older graves across four centuries. As a result, the cemetery grounds are raised several meters above street level, with up to twelve layers of burials stacked beneath your feet and 12,000 tombstone markers standing shoulder to shoulder.

Look closely at the gravestone carvings: unlike many Christian tombs of the era, Jewish gravestones feature heraldic symbols representing family lineages and professions. You will see two hands raised in priestly blessing for Kohanim, a water pitcher for Levites, a pair of scissors for tailors, a lion for Judah, and a carp for fish merchants.

Walk toward the white stone tomb of Rabbi Judah Loew, the Maharal of Prague, who passed away in 1609. The tomb is covered with small stones and folded paper notes known as *kvitlach*, containing written prayers from visitors seeking health, wisdom, and peace for Israel and humanity.`,
    historicalPeriod: '15th Century to 1787',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    tags: ['Old Jewish Cemetery', 'Prague', 'Maharal Tomb', 'Kvitlach', 'Josefov'],
    keyFacts: [
      'Contains 12,000 visible gravestones and over 100,000 burials in 12 stacked layers',
      'Revered tomb of the Maharal of Prague (d. 1609) visited by global pilgrims',
      'Features unique symbolic relief carvings depicting Cohanim, Levites, and professions'
    ]
  },
  {
    id: 'prague-spanish-synagogue',
    cityId: 'prague',
    cityName: 'Prague',
    name: 'Spanish Synagogue (Španělská Synagóga)',
    hebrewName: 'בית הכנסת הספרדי בפראג (שפניאלסקה)',
    category: 'synagogue',
    lat: 50.0901,
    lng: 14.4210,
    address: 'V Vězeňské 1, 110 00 Josefov, Praha 1, Czechia',
    shortDescription: 'Breath-taking Moorish Revival synagogue with gold-leaf arabesques inspired by Granada’s Alhambra.',
    fullDescription: 'Built in 1868 on the site of Prague’s 12th-century "Old School" synagogue, the Spanish Synagogue earns its name from its dazzling Moorish interior architecture designed by Vojtěch Ignác Ullmann and Josef Niklas. Featuring intricate gilded stucco arabesques, polished stained-glass windows, and oriental motifs modeled on the Alhambra in Spain, it houses exhibitions on Czech Jewish history and hosts classical concerts.',
    audioDuration: 210,
    transcript: `Prepare to be dazzled as you enter the Spanish Synagogue, arguably the most visually breathtaking interior in Prague.

Built in 1868 for the progressive Reform Jewish congregation of Prague, the synagogue was constructed on the site of the city’s very first 12th-century prayer hall, known as the *Stará škola* (Old School).

The name "Spanish Synagogue" refers to its Moorish Revival style, inspired by Islamic architectural masterpieces of medieval Spain like the Alhambra in Granada. Look up at the central dome and walls: every square inch is covered with hand-painted gold leaf, geometric arabesques, polished tilework, and vibrant stained glass.

In the mid-19th century, this synagogue led musical innovation under organist František Škroup, composer of the Czech national anthem. Today, the upper galleries house permanent exhibits detailing the history of Czech Jews during the 19th and 20th centuries, as well as the deep friendship and military assistance provided by Czechoslovakia to Israel during its 1948 War of Independence.`,
    historicalPeriod: '1868 (Moorish Revival Era)',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['Spanish Synagogue', 'Moorish Revival', 'Prague', 'Josefov', 'Alhambra Style'],
    keyFacts: [
      'Inaugurated in 1868 with Alhambra-inspired gilded arabesque interior',
      'Built on the site of Prague’s oldest 12th-century synagogue (Old School)',
      'Exhibits Czech Jewish history and 1948 Czech military aid to Israel'
    ]
  },
  {
    id: 'prague-kafka-monument',
    cityId: 'prague',
    cityName: 'Prague',
    name: 'Franz Kafka Monument & Dušní Precinct',
    hebrewName: 'אנדרטת פרנץ קפקה ורובע דושני',
    category: 'scholar',
    lat: 50.0899,
    lng: 14.4208,
    address: 'Dušní & Vězeňská, 110 00 Praha 1, Czechia',
    shortDescription: 'Jaroslav Róna’s bronze statue depicting Kafka sitting on the shoulders of a headless coat beside the Spanish Synagogue.',
    fullDescription: 'Unveiled in 2003 between the Spanish Synagogue and the Church of Holy Spirit, Jaroslav Róna’s bronze monument depicts literary genius Franz Kafka perched upon the shoulders of a giant headless suit, inspired by his early story "Description of a Match." Born in Prague in 1883, Kafka grew up in the Josefov district, studied law and Hebrew, and maintained a lifelong fascination with Zionism and moving to Eretz Yisrael.',
    audioDuration: 200,
    transcript: `Stand beside Jaroslav Róna’s bronze statue of Franz Kafka, located right at the boundary between Prague’s Jewish Quarter and the Old Town.

Franz Kafka was born in Prague on July 3, 1883, into a German-speaking Jewish family. His life and literary masterpieces—including "The Trial," "The Castle," and "The Metamorphosis"—were deeply rooted in the winding streets, medieval mist, and existential paradoxes of Prague.

Although Kafka’s relationship with his traditional background was complex, in his later years he immersed himself deeply in Jewish philosophy, attended Yiddish theater performances, and studied Hebrew intensively with his partner Dora Diamant. He expressed an ardent dream of emigrating to Mandatory Palestine to work in a kibbutz or open a restaurant in Jerusalem.

Look at the sculpture: a small Franz Kafka sits high on the shoulders of an empty, walking suit of clothes, symbolizing spiritual perception riding above bureaucratic absurdity.

Following Kafka’s death in 1924, his close friend Max Brod defied Kafka’s instructions to burn his unpublished manuscripts, preserving his literary legacy. Today, many of Kafka’s original letters and notebooks are preserved in the National Library of Israel in Jerusalem.`,
    historicalPeriod: '1883–1924 (Literary Legacy)',
    imageUrl: 'https://images.unsplash.com/photo-1548625361-1851e39a3857?auto=format&fit=crop&w=800&q=80',
    tags: ['Franz Kafka', 'Prague', 'Jaroslav Róna', 'Literature', 'Hebrew Studies'],
    keyFacts: [
      'Unveiled in 2003, sculpted by Czech artist Jaroslav Róna',
      'Kafka studied Hebrew in his final years and dreamed of moving to Eretz Yisrael',
      'Kafka’s manuscripts are preserved in the National Library of Israel in Jerusalem'
    ]
  },
  {
    id: 'prague-pinkas-synagogue',
    cityId: 'prague',
    cityName: 'Prague',
    name: 'Pinkas Synagogue & Terezín Children’s Drawings',
    hebrewName: 'בית הכנסת פינקס וציורי ילדי טרזין',
    category: 'synagogue',
    lat: 50.0891,
    lng: 14.4172,
    address: 'Široká 3, 110 00 Josefov, Praha 1, Czechia',
    shortDescription: 'Inscribed wall memorial bearing 77,297 names of Czech Holocaust victims and the Terezín children’s art gallery.',
    fullDescription: 'Founded in 1535 by Aaron Meshullam Horowitz, Pinkas Synagogue was converted after WWII into a solemn memorial. Its interior walls are hand-painted with the names, birth dates, and deportation dates of 77,297 Czech and Moravian Jewish victims of the Holocaust. On the upper floor, an unforgettable exhibition displays original children’s artwork created in the Terezín (Theresienstadt) ghetto under the guidance of artist Friedl Dicker-Brandeis.',
    audioDuration: 220,
    transcript: `Step inside the hushed interior of Pinkas Synagogue, one of the world’s most emotionally powerful Holocaust memorials.

As you gaze at the white vaulted walls, you will see that every square inch is covered with fine hand-painted calligraphy in red and black ink. Written here are the names of 77,297 Jewish citizens of Bohemia and Moravia who were murdered in the Holocaust. Each inscription includes the person’s full name, birth date, and the date of their final deportation.

Ascend the stairs to the upper gallery to view a collection of drawings that will touch your soul forever. Between 1942 and 1944, over 15,000 children passed through the Terezín (Theresienstadt) concentration camp ghetto.

Bauhaus artist Friedl Dicker-Brandeis secretly organized art classes for the children, encouraging them to paint their memories of home, green fields, butterfly wings, and dreams of Palestine and Jerusalem. Before she was deported to Auschwitz, Friedl packed 4,500 children’s drawings into two suitcases and hid them in Terezín.

These drawings preserved here stand as eternal beacons of innocence, creative resistance, and youthful hope surviving amid darkness.`,
    historicalPeriod: '1535 to Present (Holocaust Memorial)',
    imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
    tags: ['Pinkas Synagogue', 'Terezín Children', 'Prague', 'Friedl Dicker-Brandeis', 'Holocaust'],
    keyFacts: [
      'Walls hand-inscribed with 77,297 names of Czech Holocaust victims',
      'Houses 4,500 original children’s drawings saved from the Terezín ghetto',
      'Art classes directed by Bauhaus pioneer Friedl Dicker-Brandeis'
    ]
  },

  // ==========================================
  // LONDON TOUR STOPS (UNITED KINGDOM)
  // ==========================================
  {
    id: 'london-bevis-marks',
    cityId: 'london',
    cityName: 'London',
    name: 'Bevis Marks Synagogue (Cathedral of Sephardic Jewry)',
    hebrewName: 'בית הכנסת בוויס מרקס (קתרדלת היהדות הספרדית)',
    category: 'synagogue',
    lat: 51.5145,
    lng: -0.0784,
    address: 'Bevis Marks, City of London, EC3A 5DQ, United Kingdom',
    shortDescription: 'The oldest continuously operating synagogue in the English-speaking world, opened in 1701 by Sephardic Jews.',
    fullDescription: 'Opened in 1701 in the City of London, Bevis Marks is an architectural treasure and the spiritual mother church of Anglo-Jewry. Constructed by Sephardic Spanish and Portuguese Jews (Conversos who fled the Inquisition) following Menasseh ben Israel’s petition to Oliver Cromwell in 1656, the synagogue features original Dutch brass chandeliers, hand-carved mahogany Ark, and historical pews where Sir Moses Montefiore prayed for nearly a century.',
    audioDuration: 250,
    transcript: `Shalom and welcome to Bevis Marks Synagogue, the oldest continuously operating synagogue in the entire English-speaking world.

Dedicated in 1701, this sacred sanctuary stands as a triumph of freedom. For over 150 years following the expulsion of 1290 under King Edward I, Jews were legally barred from living in England. In 1656, Rabbi Menasseh ben Israel of Amsterdam traveled to London to meet Lord Protector Oliver Cromwell, convincing him to permit the re-settlement of Sephardic Jews who had escaped the Spanish and Portuguese Inquisition.

Pass through the iron gates into the quiet courtyard. The interior has remained virtually unchanged for over 325 years. Look up at the seven massive brass chandeliers hanging from the ceiling, imported directly from Amsterdam. The exquisite mahogany Aron HaKodesh (Holy Ark) was crafted by master carpenter Joseph Avis, who refused to accept payment on the Sabbath.

It was here at Bevis Marks that Sir Moses Montefiore served as warden and worshipper for decades, and where Disraeli—later Prime Minister of Great Britain—was baptized as a child following a dispute between his father and the synagogue board.

Bevis Marks remains an active, vibrant Sephardic house of prayer, maintaining the traditional Western Sephardic liturgy, melodies, and royal prayers for over three centuries.`,
    historicalPeriod: '1701 (Queen Anne & Sephardic Resettlement)',
    imageUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    tags: ['Bevis Marks', 'London', 'Sephardic', 'Oliver Cromwell', 'Sir Moses Montefiore'],
    keyFacts: [
      'Opened in 1701, the oldest active synagogue in the English-speaking world',
      'Founded by Spanish and Portuguese Sephardic Jews fleeing the Inquisition',
      'Preserves original 1701 brass chandeliers and mahogany Aron HaKodesh'
    ]
  },
  {
    id: 'london-montefiore',
    cityId: 'london',
    cityName: 'London',
    name: 'Sir Moses Montefiore Heritage & Royal Exchange',
    hebrewName: 'מורשת סר משה מונטיפיורי והבורסה המלכותית בלונדון',
    category: 'scholar',
    lat: 51.5138,
    lng: -0.0888,
    address: 'Royal Exchange, Cornhill, London EC3V 3LR',
    shortDescription: 'Commemorating the Anglo-Jewish financier and early Zionist pioneer who built Jerusalem’s first neighborhood outside Old City walls.',
    fullDescription: 'Sir Moses Montefiore (1784–1885) was a towering figure in Victorian Britain and global Jewish history. A wealthy stockbroker at London’s Royal Exchange and Sheriff of London, Montefiore knighted by Queen Victoria, devoted the second half of his 100-year life to humanitarian efforts and building Jewish independence in Palestine. He made seven arduous journeys to Eretz Yisrael, establishing Mishkenot Sha’ananim and the iconic Montefiore Windmill in Jerusalem in 1860.',
    audioDuration: 240,
    transcript: `Stand near the Royal Exchange in the financial center of London, where Sir Moses Montefiore built his fortune before dedicating his life to Eretz Yisrael.

Born in Livorno, Italy, into a Sephardic merchant family, Montefiore grew up in London and became one of twelve licensed Jewish brokers on the Royal Exchange. Partnering with his brother-in-law Nathan Mayer Rothschild, Montefiore amassed great wealth, retiring from business at age 40 to serve his people.

In 1837, Queen Victoria knighted Montefiore, and he was elected Sheriff of London. But his heart belonged to Zion. Between 1827 and 1875, Montefiore made seven journeys to Palestine by carriage, horseback, and sailing ship—an astounding feat in the 19th century.

In 1860, using funds bequeathed by Judah Touro, Montefiore purchased land outside the overcrowded walls of Jerusalem’s Old City, building *Mishkenot Sha’ananim*—the very first Jewish neighborhood established outside the ancient walls, alongside Jerusalem’s famous landmark windmill.

Montefiore carried a personal coat of arms emblazoned with the word "JERUSALEM" in Hebrew letters (*YERUSHALAYIM*). His energetic philanthropy laid the agricultural, industrial, and residential foundations for modern Jerusalem.`,
    historicalPeriod: '1784–1885 (Victorian Era & Early Zionism)',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['Sir Moses Montefiore', 'London', 'Jerusalem', 'Mishkenot Sha’ananim', 'Royal Exchange'],
    keyFacts: [
      'Financier, Sheriff of London, knighted by Queen Victoria in 1837',
      'Built Jerusalem’s first neighborhood outside the Old City walls (Mishkenot Sha’ananim) in 1860',
      'His coat of arms proudly featured the word "JERUSALEM" in Hebrew'
    ]
  },
  {
    id: 'london-balfour-declaration',
    cityId: 'london',
    cityName: 'London',
    name: 'Balfour Declaration Historic Site (Foreign Office & Downing Street)',
    hebrewName: 'אתר הצהרת בלפור (משרד החוץ ורחוב דאונינג 10)',
    category: 'monument',
    lat: 51.5033,
    lng: -0.1276,
    address: 'Foreign, Commonwealth & Development Office, Whitehall, London SW1A 2AH',
    shortDescription: 'The diplomatic site where Foreign Secretary Arthur Balfour issued the 1917 declaration favoring a Jewish national home in Palestine.',
    fullDescription: 'On November 2, 1917, at the Foreign Office in Whitehall, British Foreign Secretary Arthur James Balfour sent a historic letter to Lord Walter Rothschild. The Balfour Declaration officially stated: "His Majesty’s Government view with favour the establishment in Palestine of a national home for the Jewish people..." This document, forged through Dr. Chaim Weizmann’s diplomatic leadership in London, became the cornerstone of international legitimacy leading to the League of Nations Mandate and the 1948 Declaration of Independence of the State of Israel.',
    audioDuration: 255,
    transcript: `You are standing on Whitehall in London, between the Foreign Office and 10 Downing Street—the exact diplomatic ground where one of the most momentous documents in modern Jewish history was written.

On November 2, 1917, Foreign Secretary Arthur James Balfour issued an official government letter addressed to Lord Walter Rothschild, vice-president of the Board of Deputies of British Jews.

The text contained just 67 words, yet it changed the course of world history:
"His Majesty’s Government view with favour the establishment in Palestine of a national home for the Jewish people, and will use their best endeavours to facilitate the achievement of this object..."

Behind this historic breakthrough was Dr. Chaim Weizmann, a brilliant Russian-born Jewish chemist working at Manchester University and living in London. Weizmann had developed a synthetic process to produce acetone vital for the British war effort, while tirelessly advocating the Zionist cause to Prime Minister David Lloyd George and Arthur Balfour.

The Balfour Declaration was later enshrined in international law at the 1920 San Remo Conference and ratified by the League of Nations in 1922. Thirty-one years after this letter was signed, on May 14, 1948, David Ben-Gurion proclaimed the establishment of the State of Israel, fulfilling the centuries-old dream of Jewish sovereignty.`,
    historicalPeriod: 'November 2, 1917 (Balfour Declaration)',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    tags: ['Balfour Declaration', 'Chaim Weizmann', 'London', 'State of Israel', 'Whitehall'],
    keyFacts: [
      'Issued on November 2, 1917 by Foreign Secretary Arthur James Balfour to Lord Rothschild',
      'First official diplomatic recognition of a Jewish national home in Palestine',
      'Spearheaded by Dr. Chaim Weizmann, who later became the first President of Israel'
    ]
  },
  {
    id: 'london-east-end',
    cityId: 'london',
    cityName: 'London',
    name: 'East End Jewish Heritage Walk & Sandy’s Row Synagogue',
    hebrewName: 'סיור מורשת המזרח של לונדון ובית הכנסת סנדיס רואו',
    category: 'juderia',
    lat: 51.5181,
    lng: -0.0735,
    address: 'Sandy’s Row, Spitalfields, London E1 7AR',
    shortDescription: 'The historic heart of London’s immigrant Jewish East End, kosher bakeries, Yiddish theater, and Sandy’s Row Synagogue.',
    fullDescription: 'Between 1881 and 1914, over 150,000 Yiddish-speaking Jewish immigrants fleeing Tsarist pogroms arrived in London’s East End (Spitalfields and Whitechapel). Sandy’s Row Synagogue, converted in 1867 from a French Huguenot chapel by Dutch Jewish cigar makers, is the oldest surviving Ashkenazi synagogue in the East End. The surrounding streets once buzzed with Yiddish newspapers, kosher salt bakeries, bagel shops, and Zionist youth clubs sending pioneers to Palestine.',
    audioDuration: 210,
    transcript: `Step into Sandy’s Row in Spitalfields, the historic heartland of London’s immigrant Jewish East End.

In the late 19th century, Spitalfields and Whitechapel became a vibrant "Little Jerusalem" on the Thames. Over 150,000 Ashkenazi Jewish immigrants fleeing persecution in the Pale of Settlement settled in these narrow streets.

Look at Sandy’s Row Synagogue before you: established in 1854 and consecrated in 1867 by Dutch Jewish immigrants working as garment cutters and cigar makers, it is the oldest Ashkenazi synagogue remaining in the East End today.

In those days, Brick Lane and Whitechapel Road echoed with the sound of Yiddish conversation, street vendors selling hot salt beef bagels, and debate halls where political ideals flourished. It was here in the East End that Zionist youth groups gathered to study Hebrew and agricultural techniques before making Aliyah to join early kibbutzim in Mandatory Palestine.`,
    historicalPeriod: '1881–1914 (Immigrant East End Era)',
    imageUrl: 'https://images.unsplash.com/photo-1548625361-1851e39a3857?auto=format&fit=crop&w=800&q=80',
    tags: ['East End', 'Sandy’s Row', 'London', 'Spitalfields', 'Yiddish Heritage'],
    keyFacts: [
      'Sandy’s Row Synagogue (1867) is the oldest surviving Ashkenazi synagogue in the East End',
      'Home to over 150,000 Yiddish-speaking Jewish immigrants between 1881 and 1914',
      'Hub of early Zionist pioneer movements and Yiddish cultural press in Britain'
    ]
  },
  {
    id: 'london-israel-embassy',
    cityId: 'london',
    cityName: 'London',
    name: 'Embassy of the State of Israel & Chaim Weizmann Legacy House',
    hebrewName: 'שגרירות מדינת ישראל בלונדון ומורשת חיים ויצמן',
    category: 'monument',
    lat: 51.5022,
    lng: -0.1878,
    address: '2, Palace Green, Kensington, London W8 4QB',
    shortDescription: 'The diplomatic mission of the State of Israel in London, commemorating Dr. Chaim Weizmann’s presidential legacy.',
    fullDescription: 'Located at Palace Green in Kensington, the Embassy of the State of Israel is the official diplomatic mission representing the State of Israel in the United Kingdom. It stands as a symbol of the enduring, deep partnership between Britain and Israel in technology, science, intelligence, and culture. The site honors Dr. Chaim Weizmann—president of the Zionist Federation of Great Britain and the first President of the State of Israel.',
    audioDuration: 220,
    transcript: `Welcome to Kensington and Palace Green, home to the Embassy of the State of Israel in London.

The presence of an official Israeli embassy in the heart of London represents the culmination of decades of diplomatic work pioneered by Dr. Chaim Weizmann. Weizmann lived in London for over thirty years, serving as President of the Zionist Federation of Great Britain and leading international efforts to secure recognition for the Jewish State.

When Israel declared independence on May 14, 1948, Great Britain granted full diplomatic recognition in 1950, opening official ambassadorial relations. Dr. Chaim Weizmann was elected as the first President of the State of Israel, with his scientific legacy embodied today in the renowned Weizmann Institute of Science in Rehovot, Israel.

Today, the Embassy of Israel in London coordinates robust bilateral cooperation between Israel and the UK—spanning high-tech innovation, cyber defense, medical research, university exchanges, and joint cultural events celebrating British-Israeli friendship.`,
    historicalPeriod: '1948 to Present (Diplomatic & Statehood Era)',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    tags: ['Embassy of Israel', 'London', 'Chaim Weizmann', 'Kensington', 'Diplomacy'],
    keyFacts: [
      'Official diplomatic mission of the State of Israel in the United Kingdom',
      'Honors Dr. Chaim Weizmann, first President of Israel who led the Zionist movement in London',
      'Hub of UK-Israel strategic partnership in technology, medicine, and cyber defense'
    ]
  },

  // ==========================================
  // MODI'IN TOUR STOPS (ISRAEL - CENTRAL WALKABLE LOOP)
  // ==========================================
  {
    id: 'modiin-heritage-museum',
    cityId: 'modiin',
    cityName: "Modi'in",
    name: "Modi'in Heritage Museum & Maccabean Center",
    hebrewName: 'מוזיאון מורשת מודיעין ומרכז מורשת המכבים',
    category: 'museum',
    lat: 31.8988,
    lng: 35.0105,
    address: "Dam HaMaccabim St 58, Modi'in-Maccabim-Re'ut, Israel",
    shortDescription: "The central cultural museum preserving ancient Maccabean artifacts, archaeological relics, and modern Modi'in's founding story.",
    fullDescription: "Located in the heart of Modi'in along Dam HaMaccabim Street, the Modi'in Heritage Museum offers an immersive journey connecting ancient Hasmonean history with the modern growth of Israel. The museum houses authentic Second Temple pottery, coins minted during the Maccabean Revolt, interactive scale models of ancient Modi'in, and rich exhibits detailing the 167 BCE uprising led by Mattathias the High Priest. Visitors can explore interactive multimedia displays, archaeological discoveries uncovered during the city's modern construction, and educational programs on Hasmonean heritage.",
    audioDuration: 210,
    transcript: `Welcome to the Modi'in Heritage Museum, the premier gateway to understanding the profound legacy of this ancient and modern land.

Here, in the heart of Modi'in along Dam HaMaccabim Boulevard, history bridges millennia. Inside these galleries, you will discover rare archaeological treasures unearthed right beneath the modern city streets—including authentic bronze coins stamped with the palm branch and vine leaf from the Hasmonean Dynasty, 2,000-year-old oil lamps, and stone vessels used in ancient purity rituals.

As you walk through the exhibits, follow the timeline starting with the heroic refusal of Mattathias to sacrifice to pagan idols in 167 BCE, through Judah Maccabee's strategic guerilla campaign in the Judean foothills, to the rebirth of Modi'in in 1996 as one of Israel's most vibrant modern cities.

Don't miss the interactive 3D model of ancient Modi'in, demonstrating how the agricultural terraces, secret underground tunnels, and ritual baths were built into the limestone hills.`,
    historicalPeriod: '167 BCE – Present (Second Temple to Modern Era)',
    imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
    tags: ["Modi'in Museum", 'Maccabees', 'Hasmonean Artifacts', 'Archaeology', 'Israel History'],
    keyFacts: [
      'Displays authentic Hasmonean coins and Second Temple era pottery discovered during local excavations',
      "Interactive exhibits detailing Mattathias's call to revolt in 167 BCE",
      'Central educational hub for Israeli heritage, Hanukkah history, and local archaeology'
    ]
  },
  {
    id: 'modiin-central-synagogue',
    cityId: 'modiin',
    cityName: "Modi'in",
    name: "Modi'in Central Synagogue (Beit Knesset HaMerkazi)",
    hebrewName: 'בית הכנסת המרכזי מודיעין',
    category: 'synagogue',
    lat: 31.8970,
    lng: 35.0118,
    address: "Emek Dotan 32, Modi'in-Maccabim-Re'ut",
    shortDescription: "An architectural landmark synagogue blending Ashkenazi and Sephardic traditions, located a 3-minute walk from the museum.",
    fullDescription: "Standing prominently along Emek Dotan Boulevard, the Modi'in Central Synagogue is a spiritual beacon for the city's diverse Jewish community. Designed with Jerusalem stone, stained-glass windows depicting the Twelve Tribes, and an elevated Holy Ark (Aron Kodesh), the sanctuary houses active Ashkenazi, Sephardic, and Mizrahi minyanim side-by-side, reflecting the living unity of the Jewish people restored to the ancient soil of the Maccabees.",
    audioDuration: 180,
    transcript: `Welcome to the Modi'in Central Synagogue, a house of prayer and unity in the city of the Maccabees.

Notice the glowing golden warmth of the Jerusalem stone facade and the beautiful stained-glass windows illuminated by natural sunlight. Each window depicts symbols of the Twelve Tribes of Israel, celebrating the gathering of Jewish communities from every corner of the Diaspora back to their ancestral homeland.

Inside this sanctuary, daily morning, afternoon, and evening prayers resonate in both Ashkenazi and Sephardic melodies. On Hanukkah, special communal candle-lighting services bring together hundreds of local families to sing Haneirot Halalu and Maoz Tzur.

Here in 21st-century Modi'in, ancient faith and vibrant modern community unite under one roof.`,
    historicalPeriod: '21st Century (Modern Israel)',
    imageUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    tags: ["Modi'in Synagogue", 'Jerusalem Stone', 'Sephardic & Ashkenazi', 'Hanukkah Prayer', 'Spiritual Center'],
    keyFacts: [
      'Architectural landmark crafted from genuine Jerusalem stone with stained-glass Tribe windows',
      'Houses harmonious Ashkenazi, Sephardic, and Mizrahi prayer services',
      'Center for holiday celebrations, Torah study, and community gatherings'
    ]
  },
  {
    id: 'modiin-anava-park',
    cityId: 'modiin',
    cityName: "Modi'in",
    name: 'Anava Central Park & Ecological Lake',
    hebrewName: 'פארק ענבה והאגם האקולוגי',
    category: 'culture',
    lat: 31.8955,
    lng: 35.0042,
    address: "Sderot Yitzhak Rabin 1, Modi'in",
    shortDescription: "Modi'in's flagship urban park along the central valley promenade, featuring a serene ecological lake and botanical trails.",
    fullDescription: "Anava Park is the vibrant beating heart of modern Modi'in's outdoor cultural and community life. Spanning over 100 dunams along the Anava Stream valley, the park features a sparkling 14,000-square-meter ecological lake with pedal boats, a 10,000-seat amphitheater hosting major Israeli musical artists, adventure playgrounds, shaded botanical pergolas, and interconnected walking paths that link Modi'in's residential neighborhoods with its surrounding nature reserves.",
    audioDuration: 180,
    transcript: `Welcome to Anava Central Park, the green oasis and cultural heartbeat of modern Modi'in.

Take a stroll along the promenade surrounding the serene ecological lake. Designed to blend urban architecture with environmental conservation, Anava Park sits in the natural valley floor where rainwater runoff is collected and purified through natural bio-filter reed beds.

If you look up towards the grassy hillside, you'll see the open-air amphitheater. During summer evenings and holiday festivals, thousands of residents gather here for live concerts, community sing-alongs, and theatrical performances celebrating Israeli culture and art.

Anava Park represents the modern fulfillment of Modi'in: a thriving, family-friendly green city where ancient heritage meets modern quality of life.`,
    historicalPeriod: 'Modern Era (Established 2007)',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    tags: ['Anava Park', 'Ecological Lake', 'Amphitheater', "Modi'in Culture", 'Urban Park'],
    keyFacts: [
      'Features a 14,000 m² ecological lake purified by biological wetland filtration',
      'Home to a 10,000-seat outdoor amphitheater for Israeli cultural events and concerts',
      "Central green hub connecting Modi'in's eco-friendly urban design"
    ]
  },
  {
    id: 'modiin-idf-memorial',
    cityId: 'modiin',
    cityName: "Modi'in",
    name: "Modi'in IDF & Fallen Soldiers Memorial Sanctuary",
    hebrewName: 'אתר הזיכרון העירוני לחללי מערכות ישראל במודיעין',
    category: 'memorial',
    lat: 31.9010,
    lng: 35.0089,
    address: "Emek Zevulun Promenade, Central Modi'in",
    shortDescription: "A poignant civic memorial sanctuary situated along the shaded central Emek Zevulun walking promenade.",
    fullDescription: "Situated along the serene Emek Zevulun promenade, the Modi'in Fallen Soldiers Memorial is a solemn sanctuary dedicated to the memory of local residents who sacrificed their lives in defense of the State of Israel. Featuring engraved memorial stones, water reflection pools, an eternal memory flame, and quiet garden seating, the site hosts Modi'in's annual Yom HaZikaron (Memorial Day) ceremonies, connecting the selflessness of modern IDF soldiers with the ancient Maccabean spirit of defending the Homeland.",
    audioDuration: 190,
    transcript: `Welcome to the Modi'in Fallen Soldiers Memorial Sanctuary, a place of deep respect, memory, and gratitude.

As you stand before the memorial wall, take a moment of silence. Engraved into these stone tablets are the names of young men and women from Modi'in who laid down their lives serving in the Israel Defense Forces and security services.

Modi'in has one of the highest IDF enlistment and officer military service rates in the entire nation. The spirit of devotion that animated the Maccabees in these very hills two thousand years ago lives on in the courage and commitment of Israel's modern defenders.

The gentle sound of flowing water in the reflection pool symbolizes eternal life and continuity. May the memory of Israel's fallen heroes be a blessing for all generations.`,
    historicalPeriod: 'Modern State of Israel',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['IDF Memorial', 'Yom HaZikaron', "Modi'in Heroes", 'Remembrance', 'Israel Defenders'],
    keyFacts: [
      "Engraved memorial wall honoring Modi'in residents who fell in Israel's defense",
      "Host site for Modi'in's official Yom HaZikaron (Memorial Day) ceremonies",
      'Designed with water reflection pools, landscaped flora, and quiet contemplation gardens'
    ]
  },
  {
    id: 'modiin-givat-tittora',
    cityId: 'modiin',
    cityName: "Modi'in",
    name: 'Givat Tittora Fortress & Archeological Park',
    hebrewName: 'גבעת תיתורה - מצודה ופארק ארכיאולוגי',
    category: 'historic_site',
    lat: 31.9025,
    lng: 35.0163,
    address: "Tittora Hill Park, Northern Modi'in",
    shortDescription: 'A historic hilltop park accessible via central walking paths, featuring 5,000 years of ruins, Crusader fort, and Bar Kokhba caves.',
    fullDescription: "Rising majestically above Northern Modi'in at an elevation of 315 meters, Givat Tittora (Tittora Hill) commands sweeping views of the Ayalon Valley, the Mediterranean coastline, and the Judean Mountains. Continuously inhabited from the Chalcolithic age through the Ottoman Empire, the hill features the ruins of a Crusader fort (Castellum Arnaldi), ancient burial caves, underground secret hideout systems used during the Bar Kokhba Revolt against Rome, rock-cut winepresses, and seasonal wildflower carpets of wild anemones and cyclamens.",
    audioDuration: 240,
    transcript: `Welcome to Givat Tittora, the historic crown jewel of Modi'in.

Stand atop this windy hill and gaze out towards the horizon. To your west lies the Mediterranean coastal plain; to your east rise the Samarian mountains. Because of this unbeatable strategic vista overlooking the ancient highway between Jaffa and Jerusalem, warriors and kings have fortified this hill for over 5,000 years.

Look at the thick stone masonry surrounding you—these are the remains of Castellum Arnaldi, a Crusader fortress built in the 12th century to protect Christian pilgrims traveling up to Jerusalem.

Beneath your feet, the limestone hill is crisscrossed by an intricate labyrinth of subterranean caves and narrow crawlways. During the Bar Kokhba Revolt in 132 CE, Jewish freedom fighters carved these hidden underground complexes to store grain, hide weapons, and launch surprise guerilla strikes against Roman legions.`,
    historicalPeriod: 'Bronze Age to Crusader Era (12th Century CE)',
    imageUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    tags: ['Givat Tittora', 'Crusader Fort', 'Bar Kokhba Caves', 'Ayalon View', "Modi'in Hill"],
    keyFacts: [
      'Continuous human settlement spanning 5,000 years from the Early Bronze Age',
      'Site of Crusader fortress Castellum Arnaldi protecting the road to Jerusalem',
      'Extensive underground secret tunnel networks used by Bar Kokhba rebels'
    ]
  }
];

export const HERZL_CITY_SUGGESTED_TOPICS: Record<string, string[]> = {
  modiin: [
    'Tell me about the Maccabean Revolt of 167 BCE that began right here in Modi’in',
    'What can I discover at the Modi’in Heritage Museum and the Central Synagogue?',
    'What makes Anava Park and its ecological lake the green heartbeat of modern Modi’in?',
    'What secrets are hidden in the Bar Kokhba caves and Crusader fortress at Givat Tittora?',
  ],
  budapest: [
    'Tell me about Theodor Herzl’s birthplace in Budapest and his Zionist vision',
    'What is the story behind the Shoes on the Danube Bank memorial?',
    'Why is the Dohány Street Synagogue the largest synagogue in Europe?',
    'How did Raoul Wallenberg save thousands of Jews in Budapest?',
  ],
  vienna: [
    'Why is the Stadttempel the only historic synagogue in Vienna to survive Kristallnacht?',
    'How did Theodor Herzl’s years in Vienna transform modern Zionist history?',
    'What does the Judenplatz Holocaust Memorial represent?',
    'Tell me about Aliyah Bet and secret rescue transit routes through Vienna',
  ],
  warsaw: [
    'Explain the Warsaw Ghetto Uprising and Mordechai Anielewicz at Miła 18',
    'What can I discover at POLIN Museum of 1,000 Years of Polish Jews?',
    'Who was Janusz Korczak and what is his heroic legacy in Warsaw?',
    'Why is Nożyk Synagogue historic and how did it survive WWII?',
  ],
  prague: [
    'What is the legend of the Golem of Prague and the Maharal?',
    'Why is the Old-New Synagogue (Altneuschul) Europe’s oldest active synagogue?',
    'Tell me about Franz Kafka’s Hebrew studies and Jewish identity in Prague',
    'What is memorialized on the walls of Pinkas Synagogue?',
  ],
  london: [
    'How was the historic 1917 Balfour Declaration crafted in London?',
    'Tell me about Bevis Marks (1701), the oldest active Sephardic synagogue in Britain',
    'What was Sir Moses Montefiore’s connection between London and Jerusalem?',
    'How did Jewish East End immigration inspire early Zionist movements in Britain?',
  ],
};

export const HERZL_SUGGESTED_TOPICS = [
  'Tell me about Theodor Herzl’s birthplace in Budapest and his Zionist vision',
  'What is the story behind the Golem of Prague and the Old-New Synagogue?',
  'Explain the Warsaw Ghetto Uprising and Mordechai Anielewicz’s final stand at Miła 18',
  'How was the 1917 Balfour Declaration created in London?',
  'Why is the Stadttempel in Vienna the only historic synagogue that survived Kristallnacht?',
];
