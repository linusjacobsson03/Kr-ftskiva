# 🦞 Kräftskiva

En mobilanpassad webbapp (PWA) för kräftskivan — skapa konto, dela foton från
kvällen, få pushnotiser med tidsbegränsade utmaningar (med bildbevis) och
tävla om kvällens kräftbukal på topplistan.

## Funktioner

- **Konto**: välj användarnamn + lösenord, du kommer direkt in med ditt namn.
  Första personen som registrerar sig blir automatiskt admin.
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

### Data

All data (användare, foton, utmaningar, poäng) sparas i en SQLite-fil under
`data/kraftskiva.db`. Filen skapas automatiskt och ligger utanför git.
Kör appen på en server/dator som är igång under hela festen (t.ex. en gammal
laptop eller en liten VPS) så att datan finns kvar mellan omstarter — mappen
`data/` bör ligga på en beständig disk.

### Miljövariabler (valfria)

Behövs normalt inte, men kan sättas i en `.env.local`-fil om du vill styra
dem manuellt istället för att låta appen generera dem:

| Variabel | Syfte |
| --- | --- |
| `SESSION_SECRET` | Nyckel för att signera inloggningssessioner |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Nycklar för Web Push-notiser |
| `DATABASE_PATH` | Sökväg till sqlite-filen (annars `data/kraftskiva.db`) |

## Distribuera till festen

För att pushnotiser och "Lägg till på hemskärmen" ska fungera behöver appen
köras över **HTTPS** (localhost fungerar också, för test). Enklast är att
deploya till valfri Node-hosting som stödjer en beständig disk för
`data/`-mappen (SQLite är fil-baserad).

På iPhone måste appen läggas till på hemskärmen (Dela ⬆️ → "Lägg till på
hemskärmen") innan pushnotiser går att aktivera — det är en begränsning i
Safari, inte i appen. Appen visar en påminnelse om detta på startsidan.

## Teknik

Next.js (App Router) + TypeScript + Tailwind CSS, better-sqlite3 för
lagring, `jose` för sessioner, `web-push` för notiser. Inga externa
tjänster eller API-nycklar krävs.
