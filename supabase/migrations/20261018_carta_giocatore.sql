-- Carta del giocatore stile "figurina": soprannome, ruolo e 6 abilità da 1 a 99
alter table public.giocatori
  add column soprannome text check (char_length(soprannome) <= 30),
  add column ruolo text check (ruolo in ('POR','DIF','CEN','ATT')),
  add column abilita smallint[] check (
    abilita is null or (array_length(abilita, 1) = 6 and 1 <= all (abilita) and 99 >= all (abilita))
  );

create or replace function public.admin_salva_giocatore(pin text, giocatore_id uuid, campi jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  update public.giocatori g set
    nome       = case when campi ? 'nome' and trim(campi->>'nome') <> '' then trim(campi->>'nome') else g.nome end,
    numero     = case when campi ? 'numero' then (campi->>'numero')::int else g.numero end,
    fascia     = case when campi ? 'fascia' then campi->>'fascia' else g.fascia end,
    squadra_id = case when campi ? 'squadra_id' then nullif(campi->>'squadra_id', '') else g.squadra_id end,
    foto_path  = case when campi ? 'foto_path' and campi->>'foto_path' is null then null else g.foto_path end,
    soprannome = case when campi ? 'soprannome' then nullif(trim(campi->>'soprannome'), '') else g.soprannome end,
    ruolo      = case when campi ? 'ruolo' then nullif(campi->>'ruolo', '') else g.ruolo end,
    abilita    = case when campi ? 'abilita' then
                   (select array_agg(v::smallint order by n) from jsonb_array_elements_text(campi->'abilita') with ordinality as t(v, n)
                     where jsonb_typeof(campi->'abilita') = 'array')
                 else g.abilita end
  where g.id = giocatore_id;
  if not found then raise exception 'Giocatore non trovato'; end if;
end $$;
