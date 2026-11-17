# tasklist v4 - sessions

## 1. sessions und cookies

eine session merkt sich auf dem server, wer angemeldet ist. der browser speichert
die session-id in einem cookie und schickt sie bei weiteren anfragen mit.
das passwort steht nicht im cookie.

authentifizierung: wer bist du? das prüfen wir beim login.
autorisierung: was darfst du? zum beispiel darf nur ein admin rollen ändern.

der memorystore speichert sessions im arbeitsspeicher. beim neustart sind sie weg.
mehrere server können diese sessions nicht teilen. für den produktivbetrieb braucht
man einen gemeinsamen speicher, zum beispiel redis.

## 2–3. login, logout und registrierung

beim login prüfen wir das passwort mit bcrypt. bei falschen daten kommt immer
dieselbe meldung. nach der registrierung ist man direkt angemeldet.
die profilbild-aufgabe bleibt erhalten. eine doppelte e-mail wird verständlich gemeldet.
wer schon angemeldet ist, wird von login und registrierung zur startseite geschickt.
beim logout wird die session gelöscht.

## 4-6. zugriff und aufgaben

bei jeder anfrage laden wir den benutzer neu aus der datenbank. gäste müssen sich
anmelden. nur admins dürfen benutzer verwalten und aufgaben zuweisen.
der letzte admin darf seine rolle nicht verlieren, auch nicht bei gleichzeitigen änderungen.

neue aufgaben bekommen den angemeldeten benutzer als ersteller.
admins sehen alle aufgaben. normale benutzer sehen nur eigene oder zugewiesene aufgaben.
nur admin, ersteller oder zugewiesener benutzer dürfen eine aufgabe erledigen oder löschen.

`services/taskService.js` enthält die datenbankabfragen für aufgaben.
ein gemeinsamer filter prüft den zugriff beim laden, erledigen und löschen.
der controller prüft die eingaben und gibt die antwort zurück.

## 7. sicherheit

- nach login und registrierung gibt es eine neue session-id. eine vorher bekannte id hilft einem angreifer dann nicht mehr.
- `httpOnly`: javascript kann das cookie nicht auslesen. das erschwert den diebstahl des cookies bei xss.
- `sameSite: 'lax'`: das cookie wird bei fremden post-anfragen normalerweise nicht mitgeschickt. das verringert csrf-angriffe.
- `maxAge`: das cookie läuft nach zwei stunden ab.
- `secure`: in produktion wird das cookie nur über https gesendet. hinter einem proxy muss express passend eingerichtet sein.
- `SESSION_SECRET`: kommt aus der umgebung und signiert die session-id. das secret bleibt in `.env` und kommt nicht in git.

## starten

mysql starten. dann `npm install`, `npx prisma generate` und `npm start` ausführen.
in `.env` müssen `DATABASE_URL` und ein zufälliger `SESSION_SECRET` stehen.
die datenbank aus v3 bleibt gleich. es gibt keine neue migration.
für einen admin: `ADMIN_PASSWORD` in `.env` setzen und `npm run seed` ausführen.

## tests - 17.11.2026

17 prüfungen waren erfolgreich, auch im echten chrome-browser.
die prüfungen liefen in einer eigenen testdatenbank, die danach gelöscht wurde.

- ohne login: startseite, aufgaben und benutzerverwaltung leiten zu `/login` weiter.
- falsches passwort oder unbekannte e-mail: 401, gleiche fehlermeldung.
- registrierung: direkt angemeldet, rolle `user`, passwort gehasht und profilbild-aufgabe erstellt.
- doppelte e-mail: verständliche meldung.
- fehler bei der profilbild-aufgabe: der benutzer wird auch nicht gespeichert.
- angemeldet login oder registrierung öffnen: weiterleitung zur startseite.
- normaler benutzer öffnet die benutzerverwaltung oder weist aufgaben zu: 403, auch bei direkten anfragen.
- normale aufgabenliste: nur eigene und zugewiesene aufgaben.
- fremde aufgabe erledigen oder löschen: 404, nichts geändert.
- eigene oder zugewiesene aufgabe erledigen oder löschen: erlaubt.
- admin sieht alle aufgaben und darf rollen und zuweisungen ändern.
- letzten admin herabstufen: verhindert, auch bei gleichzeitigen änderungen.
- rolle bei laufender session ändern: neue rolle gilt bei der nächsten anfrage.
- login und registrierung: neue session-id, alte id funktioniert nicht mehr.
- logout oder gelöschter benutzer: kein zugriff mehr.
- browser: registrierung, aufgabe erstellen, erledigen, löschen und logout funktionieren.

`npm audit` meldet drei zusammenhängende probleme in den bestehenden prisma-werkzeugen.
der automatische fix würde prisma von version 6 auf 7 ändern. das gehört nicht zu dieser aufgabe.
