# Torneo Siervoplast

Web app (PWA) per seguire il torneo di calcio aziendale: risultati in diretta, classifica,
marcatori, rose e sorteggio live delle squadre.

- Frontend: Vite + React + TypeScript, pubblicato su GitHub Pages dal workflow `.github/workflows/pubblica.yml`.
- Dati: Supabase. L'accesso avviene solo tramite codici (pubblico per gli spettatori,
  personale per gli organizzatori); le tabelle non sono leggibili direttamente.
  Lo schema è in `supabase/migrations/`, la funzione per le foto in `supabase/functions/carica-foto/`.

Sviluppo locale: `npm install` e poi `npm run dev`.
