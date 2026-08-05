# 🦞 Kräftskiva

En mobilanpassad webbapp (PWA) för kräftskivan — skapa konto, dela foton från
kvällen, få pushnotiser med tidsbegränsade utmaningar (med bildbevis) och
tävla om kvällens kräftbukal på topplistan.

## Funktioner

- **Konto**: skriv in förnamn, efternamn och lösenord, du kommer direkt in
  med ditt namn. Två personer får gärna heta samma sak — lösenordet skiljer
  er åt.
- **Foton**: alla kan ladda upp bilder från kvällen i ett gemensamt flöde,
  eller ta en direkt i appen (framkamerans förhandsvisning spegelvänds som
  förväntat, men den sparade bilden blir rättvänd — som i Snapchat).
- **Admin**: en egen, lösenordsskyddad yta (`/admin`, se nedan) — inte
  knuten till något visst konto. Där skapas utmaningar (t.ex. "pussa någon
  på kinden") som skickas direkt eller schemaläggs till alla, en slumpad
  person, eller en namngiven person. Mottagaren får en pushnotis och har 5
  minuter på sig att ladda upp ett bildbevis för att få poängen.
- **Topplista**: poängen summeras live och rankar alla deltagare.
- **PWA / pushnotiser**: appen går att lägga till på hemskärmen på både
  iPhone och Android och skickar riktiga pushnotiser (Web Push) när en ny
  utmaning skickas ut.

## Kom igång lokalt

```bash
npm install
npm run dev
```

Öppna `http://localhost:3000`, skapa ett konto och gå till **Admin**-fliken
— den frågar efter ett lösenord (se **Admin-lösenord** nedan) första gången
i en webbläsare, sen kommer du in direkt. Under **"Godkänn"** kan du klicka
**"Hämta
förslag"** för att fylla på en kö med färdiga kräftskiva-utmaningar i fyra
svårighetsgrader (1p Lätt / 2p Medel / 3p Svår / 5p Vågad) — gå igenom dem en
och en och godkänn eller avslå. Godkända utmaningar dyker upp under fliken
**"Utmaningar"**, redo att skickas ut direkt (till alla eller en slumpad
person) eller **schemaläggas** till en specifik tid och mottagare (slumpad,
en namngiven person, eller alla) — se fliken **"Schema"** för kommande och
skickade utmaningar, med möjlighet att avboka. Alla utmaningar har 5 minuter
på sig att lösas, oavsett svårighetsgrad. Du kan förstås också skapa egna
utmaningar direkt i "Utmaningar" — de läggs till som redan godkända.

Schemaläggningen körs av en enkel poller inbyggd i appens serverprocess
(kollar var 15:e sekund om något är dags att skickas) — den fungerar så
länge servern är igång (lokalt, eller `next start` på en dator som är på
hela kvällen). Kör du på en plattform utan en långlivad serverprocess (t.ex.
Vercels serverless-funktioner) kommer schemalagda utmaningar **inte**
skickas ut av sig själva där.

Inget manuellt konfigureringssteg krävs — appen genererar och sparar sin
egen sessionsnyckel och sina egna VAPID-nycklar (för pushnotiser) i
databasen vid första körningen.

### Data & databas

Appen använder [libSQL](https://turso.tech) (SQLite-kompatibelt) via
`@libsql/client`. **Lokalt behövs ingen databas alls** — appen skapar
automatiskt en SQLite-fil under `data/kraftskiva.db` och funkar direkt.

För att köra appen i produktion (t.ex. deployad på Vercel eller liknande,
där disken inte är beständig mellan requests) kopplar du appen till en
**gratis hostad databas hos Turso** istället — samma kod, ingen kodändring:

1. Gå till [turso.tech](https://turso.tech) och skapa ett gratiskonto
   (free tier räcker gott och väl för en kräftskiva).
2. Skapa en databas, t.ex. via deras webb-UI eller CLI:
   ```bash
   turso db create kraftskiva
   turso db show kraftskiva --url          # → TURSO_DATABASE_URL
   turso db tokens create kraftskiva       # → TURSO_AUTH_TOKEN
   ```
3. Lägg till de två värdena som miljövariabler där appen körs (t.ex.
   Vercel → Project Settings → Environment Variables, eller i
   `.env.local` lokalt):
   ```
   TURSO_DATABASE_URL=libsql://ditt-databasnamn.turso.io
   TURSO_AUTH_TOKEN=det-långa-token-du-fick
   ```
4. Starta om appen — den upptäcker variablerna automatiskt och skapar
   tabellerna i den hostade databasen första gången den startar.

Utan dessa variabler faller appen tillbaka till den lokala SQLite-filen, så
du kan alltid utveckla/testa lokalt utan Turso-konto.

### Miljövariabler (valfria)

| Variabel | Syfte |
| --- | --- |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Gratis hostad databas (se ovan). Utelämnas = lokal SQLite-fil. |
| `SESSION_SECRET` | Nyckel för att signera inloggningssessioner (annars auto-genererad) |
| `ADMIN_PASSCODE` | Lösenordet för `/admin` (annars slumpas ett fram vid första körningen — se nedan) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Nycklar för Web Push-notiser (annars auto-genererade) |
| `DATABASE_PATH` | Sökväg till lokal sqlite-fil (annars `data/kraftskiva.db`) — ignoreras om Turso är satt |

### Admin-lösenord

`/admin` är en egen yta skyddad av ett delat lösenord istället för att vara
knuten till ett visst konto — vem som helst som kan lösenordet kommer åt
den, oavsett vilket (eller om något) konto de råkar vara inloggade på i
appen i övrigt. Praktiskt om flera ska kunna hjälpa till att sköta
utmaningarna under kvällen.

Sätt ditt eget lösenord med `ADMIN_PASSCODE` i `.env.local` **innan** första
körningen (annars slumpas ett fram och sparas i databasen — kolla i så fall
`data`-tabellen `settings`, nyckeln `admin_passcode_hash`, för att byta det
i efterhand). Glömt lösenordet och ingen `ADMIN_PASSCODE` satt? Radera raden
med `key = 'admin_passcode_hash'` ur `settings`-tabellen så genereras ett
nytt (eller sätt env-variabeln och starta om).

## Distribuera till festen

För att pushnotiser och "Lägg till på hemskärmen" ska fungera behöver appen
köras över **HTTPS** (localhost fungerar också, för test).

Om du deployar till en plattform utan beständig disk (Vercel, Netlify m.fl.)
**måste** du sätta `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (se ovan) —
annars nollställs all data vid varje ny driftsättning. Kör du istället på en
egen server/dator (en gammal laptop, en liten VPS) som är igång hela kvällen
räcker den lokala SQLite-filen fint, så länge `data/`-mappen ligger kvar
mellan omstarter.

På iPhone måste appen läggas till på hemskärmen (Dela ⬆️ → "Lägg till på
hemskärmen") innan pushnotiser går att aktivera — det är en begränsning i
Safari, inte i appen. Appen visar en påminnelse om detta på startsidan.

## Teknik

Next.js (App Router) + TypeScript + Tailwind CSS, libSQL/Turso för lagring
(gratis, SQLite-kompatibel), `jose` för sessioner, `web-push` för notiser.
Inga betalda tjänster eller API-nycklar krävs.
