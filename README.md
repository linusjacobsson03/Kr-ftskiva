# 🦞 Kräftskiva

En mobilanpassad webbapp (PWA) för kräftskivan — skapa konto, dela foton från
kvällen, få pushnotiser med tidsbegränsade utmaningar (med bildbevis) och
tävla om kvällens kräftbukal på topplistan.

## Funktioner

- **Konto**: skriv in förnamn, efternamn och lösenord, du kommer direkt in
  med ditt namn. Två personer får gärna heta samma sak — lösenordet skiljer
  er åt. Första personen som registrerar sig blir automatiskt admin.
- **Foton**: alla kan ladda upp bilder från kvällen i ett gemensamt flöde.
- **Utmaningar**: adminen skapar utmaningar (t.ex. "pussa någon på kinden")
  och skickar dem till alla eller en slumpad person. Mottagaren får en
  pushnotis och har en begränsad tid (standard 2 minuter) på sig att ladda
  upp ett bildbevis för att få poängen.
- **Topplista**: poängen summeras live och rankar alla deltagare.
- **PWA / pushnotiser**: appen går att lägga till på hemskärmen på både
  iPhone och Android och skickar riktiga pushnotiser (Web Push) när en ny
  utmaning skickas ut.

## Kom igång lokalt

```bash
npm install
npm run dev
```

Öppna `http://localhost:3000`, skapa ett konto (blir automatiskt admin) och
gå till **Admin**-fliken för att lägga till utmaningar. Knappen
**"✨ Exempel-utmaningar"** lägger in tio färdiga kräftskiva-utmaningar att
skicka ut direkt.

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
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Nycklar för Web Push-notiser (annars auto-genererade) |
| `DATABASE_PATH` | Sökväg till lokal sqlite-fil (annars `data/kraftskiva.db`) — ignoreras om Turso är satt |

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
