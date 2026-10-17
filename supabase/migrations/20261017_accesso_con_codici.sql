-- =========================================================
-- Nuovo modello di accesso: niente account.
--  * spettatori: codice torneo (uguale per tutti)
--  * organizzatori: codice personale (salvato cifrato)
-- Tutte le letture/scritture passano da funzioni che controllano il codice.
-- La tabella "segnale" (pubblica, senza dati) avvisa i telefoni che qualcosa è cambiato.
-- =========================================================
create extension if not exists pgcrypto with schema extensions;

-- via le vecchie regole basate sugli account
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'foto %' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

drop function public.entra(text);
drop function public.estrai_giocatore();
drop function public.azzera_sorteggio();
drop function public.genera_calendario();
drop function public.genera_semifinali();
drop function public.is_organizzatore();
drop function public.puo_vedere();
drop table public.spettatori;
drop table public.organizzatori;

alter publication supabase_realtime drop table public.partite, public.eventi, public.giocatori, public.sorteggio, public.impostazioni;

alter table public.eventi drop column created_by;
alter table public.eventi add column inserito_da text;

create table public.organizzatori (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pin_hash text not null,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.organizzatori enable row level security;

create table public.tentativi_falliti (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index on public.tentativi_falliti(ip, at);
alter table public.tentativi_falliti enable row level security;

-- nessun accesso diretto alle tabelle dall'esterno: solo tramite funzioni
revoke all on all tables in schema public from anon, authenticated;

-- ---------- Segnale per il tempo reale ----------
create table public.segnale (
  id int primary key default 1 check (id = 1),
  versione bigint not null default 0,
  at timestamptz not null default now()
);
insert into public.segnale(id) values (1);
alter table public.segnale enable row level security;
create policy "lettura pubblica" on public.segnale for select to anon, authenticated using (true);
grant select on public.segnale to anon, authenticated;
alter publication supabase_realtime add table public.segnale;

-- ---------- Funzioni interne (schema non esposto) ----------
create schema if not exists privato;
revoke all on schema privato from public, anon, authenticated;

create or replace function privato.segnala() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.segnale set versione = versione + 1, at = now() where id = 1;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['impostazioni','squadre','giocatori','partite','eventi','sorteggio'] loop
    execute format('create trigger segnala after insert or update or delete on public.%I for each statement execute function privato.segnala()', t);
  end loop;
end $$;

create or replace function privato.ip() returns text language sql stable set search_path = '' as $$
  select coalesce(nullif(trim(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1)), ''), 'sconosciuto')
$$;

create or replace function privato.bloccato() returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) >= 10 from public.tentativi_falliti where ip = privato.ip() and at > now() - interval '15 minutes'
$$;

create or replace function privato.fallito() returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tentativi_falliti(ip) values (privato.ip());
  delete from public.tentativi_falliti where at < now() - interval '1 day';
  perform pg_sleep(0.8);
end $$;

create or replace function privato.nome_organizzatore(pin text) returns text language sql stable security definer set search_path = '' as $$
  select o.nome from public.organizzatori o
   where o.attivo and o.pin_hash = extensions.crypt(upper(trim(pin)), o.pin_hash)
   limit 1
$$;

-- per le funzioni di gestione: errore se il codice non è di un organizzatore
create or replace function privato.richiedi_organizzatore(pin text) returns text language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  n := privato.nome_organizzatore(coalesce(pin, ''));
  if n is null then
    perform pg_sleep(0.8);
    raise exception 'Codice organizzatore non valido';
  end if;
  return n;
end $$;

create or replace function privato.nuovo_codice(lunghezza int, gruppi int) returns text language plpgsql volatile set search_path = '' as $$
declare alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := extensions.gen_random_bytes(lunghezza); r text := ''; i int;
begin
  for i in 0..lunghezza-1 loop
    if i > 0 and i % gruppi = 0 then r := r || '-'; end if;
    r := r || substr(alfabeto, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return r;
end $$;

-- ---------- Lettura: tutto il torneo in un colpo ----------
create or replace function public.torneo(codice text) returns json language plpgsql volatile security definer set search_path = '' as $$
declare org text; ok boolean;
begin
  if privato.bloccato() then return json_build_object('errore', 'Troppi tentativi errati: riprova tra 15 minuti'); end if;
  ok := exists (select 1 from public.accesso a where upper(a.codice) = upper(trim(codice)));
  if not ok then
    org := privato.nome_organizzatore(codice);
    ok := org is not null;
  end if;
  if not ok then
    perform privato.fallito();
    return json_build_object('errore', 'Codice non valido');
  end if;

  return json_build_object(
    'organizzatore', org,
    'impostazioni', (select row_to_json(i) from public.impostazioni i where i.id = 1),
    'squadre',   (select coalesce(json_agg(s order by s.ordine), '[]'::json) from public.squadre s),
    'giocatori', (select coalesce(json_agg(g order by g.nome), '[]'::json) from public.giocatori g),
    'partite',   (select coalesce(json_agg(p), '[]'::json) from public.partite p),
    'eventi',    (select coalesce(json_agg(e order by e.created_at), '[]'::json) from public.eventi e),
    'sorteggio', (select coalesce(json_agg(x order by x.id), '[]'::json) from public.sorteggio x)
  );
end $$;

-- ---------- Gestione (solo organizzatori) ----------
create or replace function public.admin_verifica(pin text) returns text language plpgsql security definer set search_path = '' as $$
begin
  return privato.richiedi_organizzatore(pin);
end $$;

create or replace function public.admin_aggiorna_partita(pin text, partita_id uuid, campi jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare nuovo_stato text := campi->>'stato';
begin
  perform privato.richiedi_organizzatore(pin);
  if nuovo_stato is not null and nuovo_stato not in ('programmata','in_corso','finita') then raise exception 'Stato non valido'; end if;
  update public.partite p set
    data_ora      = case when campi ? 'data_ora' then (campi->>'data_ora')::timestamptz else p.data_ora end,
    campo         = case when campi ? 'campo' then nullif(trim(campi->>'campo'), '') else p.campo end,
    rigori_casa   = case when campi ? 'rigori_casa' then (campi->>'rigori_casa')::int else p.rigori_casa end,
    rigori_ospite = case when campi ? 'rigori_ospite' then (campi->>'rigori_ospite')::int else p.rigori_ospite end,
    mvp_id        = case when campi ? 'mvp_id' then (campi->>'mvp_id')::uuid else p.mvp_id end,
    stato         = coalesce(nuovo_stato, p.stato),
    iniziata_at   = case when nuovo_stato = 'in_corso' and p.iniziata_at is null then now()
                         when nuovo_stato = 'programmata' then null else p.iniziata_at end,
    finita_at     = case when nuovo_stato = 'finita' then now()
                         when nuovo_stato is not null then null else p.finita_at end
  where p.id = partita_id;
  if not found then raise exception 'Partita non trovata'; end if;
end $$;

create or replace function public.admin_aggiungi_evento(pin text, partita_id uuid, tipo text, giocatore_id uuid, assist_id uuid, minuto int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare n text; sq text; p public.partite; nuovo uuid;
begin
  n := privato.richiedi_organizzatore(pin);
  select * into p from public.partite x where x.id = partita_id;
  if p.id is null then raise exception 'Partita non trovata'; end if;
  select g.squadra_id into sq from public.giocatori g where g.id = giocatore_id;
  if sq is null or sq not in (p.casa_id, p.ospite_id) then raise exception 'Il giocatore non è in una delle due squadre'; end if;
  if assist_id is not null and tipo <> 'gol' then raise exception 'L''assist vale solo per i gol'; end if;
  if assist_id is not null and not exists (select 1 from public.giocatori g where g.id = assist_id and g.squadra_id = sq) then
    raise exception 'L''assist deve essere di un compagno di squadra';
  end if;
  insert into public.eventi(partita_id, tipo, giocatore_id, squadra_id, assist_id, minuto, inserito_da)
  values (partita_id, tipo, giocatore_id, sq, assist_id, minuto, n) returning id into nuovo;
  return nuovo;
end $$;

create or replace function public.admin_elimina_evento(pin text, evento_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  delete from public.eventi where id = evento_id;
end $$;

create or replace function public.admin_salva_giocatore(pin text, giocatore_id uuid, campi jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  update public.giocatori g set
    nome       = case when campi ? 'nome' and trim(campi->>'nome') <> '' then trim(campi->>'nome') else g.nome end,
    numero     = case when campi ? 'numero' then (campi->>'numero')::int else g.numero end,
    fascia     = case when campi ? 'fascia' then campi->>'fascia' else g.fascia end,
    squadra_id = case when campi ? 'squadra_id' then nullif(campi->>'squadra_id', '') else g.squadra_id end,
    foto_path  = case when campi ? 'foto_path' and campi->>'foto_path' is null then null else g.foto_path end
  where g.id = giocatore_id;
end $$;

create or replace function public.admin_aggiungi_giocatore(pin text, nome text, fascia text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare nuovo uuid;
begin
  perform privato.richiedi_organizzatore(pin);
  insert into public.giocatori(nome, fascia) values (trim(nome), fascia) returning id into nuovo;
  return nuovo;
end $$;

create or replace function public.admin_elimina_giocatore(pin text, giocatore_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  if exists (select 1 from public.eventi e where e.giocatore_id = admin_elimina_giocatore.giocatore_id or e.assist_id = admin_elimina_giocatore.giocatore_id) then
    raise exception 'Non si può eliminare: ha già eventi registrati nelle partite';
  end if;
  delete from public.giocatori g where g.id = admin_elimina_giocatore.giocatore_id;
end $$;

create or replace function public.admin_salva_impostazioni(pin text, nome_torneo text, avviso text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  update public.impostazioni set nome_torneo = coalesce(nullif(trim(admin_salva_impostazioni.nome_torneo), ''), 'Torneo Siervoplast'),
    avviso = nullif(trim(admin_salva_impostazioni.avviso), '') where id = 1;
end $$;

create or replace function public.admin_codice_accesso(pin text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  return (select codice from public.accesso where id = 1);
end $$;

create or replace function public.admin_cambia_codice(pin text, nuovo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  if length(trim(nuovo)) < 6 then raise exception 'Il codice deve avere almeno 6 caratteri'; end if;
  update public.accesso set codice = upper(trim(nuovo)) where id = 1;
end $$;

create or replace function public.admin_organizzatori(pin text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  return (select coalesce(json_agg(json_build_object('id', o.id, 'nome', o.nome) order by o.created_at), '[]'::json)
          from public.organizzatori o where o.attivo);
end $$;

-- restituisce il codice personale del nuovo organizzatore (mostrato una volta sola)
create or replace function public.admin_aggiungi_organizzatore(pin text, nome text) returns text
language plpgsql security definer set search_path = '' as $$
declare c text := privato.nuovo_codice(12, 4);
begin
  perform privato.richiedi_organizzatore(pin);
  if trim(coalesce(nome, '')) = '' then raise exception 'Serve un nome'; end if;
  insert into public.organizzatori(nome, pin_hash) values (trim(nome), extensions.crypt(c, extensions.gen_salt('bf')));
  return c;
end $$;

create or replace function public.admin_rimuovi_organizzatore(pin text, organizzatore_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  if (select count(*) from public.organizzatori where attivo) <= 1 then raise exception 'Deve restare almeno un organizzatore'; end if;
  update public.organizzatori set attivo = false where id = organizzatore_id;
end $$;

-- ---------- Sorteggio, calendario, semifinali (ora col codice) ----------
create or replace function public.estrai_giocatore(pin text) returns json language plpgsql security definer set search_path = '' as $$
declare f text; g uuid; sq text; rid bigint;
begin
  perform privato.richiedi_organizzatore(pin);
  perform pg_advisory_xact_lock(4242);
  select x.fascia into f from public.giocatori x
   where x.squadra_id is null and not x.fisso and x.fascia <> 'EXT' order by x.fascia limit 1;
  if f is null then raise exception 'Urna vuota: tutti i giocatori sono stati sorteggiati'; end if;
  select x.id into g from public.giocatori x
   where x.squadra_id is null and not x.fisso and x.fascia = f order by random() limit 1;
  -- riceve la squadra interna con meno giocatori; a parità la più "debole" (A=4..D=1); poi a caso
  select s.id into sq from public.squadre s
   left join public.giocatori x on x.squadra_id = s.id
   where not s.esterna group by s.id
   order by count(x.id),
            coalesce(sum(case x.fascia when 'A' then 4 when 'B' then 3 when 'C' then 2 when 'D' then 1 else 0 end), 0),
            random()
   limit 1;
  update public.giocatori set squadra_id = sq where id = g;
  insert into public.sorteggio(giocatore_id, squadra_id) values (g, sq) returning id into rid;
  return json_build_object('id', rid, 'giocatore_id', g, 'squadra_id', sq, 'fascia', f);
end $$;

create or replace function public.azzera_sorteggio(pin text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privato.richiedi_organizzatore(pin);
  if exists (select 1 from public.eventi) then raise exception 'Il torneo è già iniziato: impossibile rifare il sorteggio'; end if;
  update public.giocatori set squadra_id = null where not fisso and squadra_id is not null;
  delete from public.sorteggio where true;
end $$;

create or replace function public.genera_calendario(pin text) returns int language plpgsql security definer set search_path = '' as $$
declare t text[]; n int; r int; i int; casa text; osp text; tmp text; cnt int := 0;
begin
  perform privato.richiedi_organizzatore(pin);
  if exists (select 1 from public.partite where stato <> 'programmata') then
    raise exception 'Ci sono partite già iniziate: calendario bloccato';
  end if;
  delete from public.partite where true;
  select array_agg(id order by random()) into t from public.squadre;
  n := array_length(t, 1);
  if n is null or n < 2 then raise exception 'Servono almeno 2 squadre'; end if;
  if n % 2 = 1 then t := t || array[null::text]; n := n + 1; end if;
  for r in 1..n-1 loop
    for i in 1..n/2 loop
      casa := t[i]; osp := t[n - i + 1];
      if (i = 1 and r % 2 = 0) or (i > 1 and i % 2 = 0) then tmp := casa; casa := osp; osp := tmp; end if;
      if casa is not null and osp is not null then
        insert into public.partite(fase, giornata, casa_id, ospite_id) values ('girone', r, casa, osp);
        cnt := cnt + 1;
      end if;
    end loop;
    t := array[t[1]] || array[t[n]] || t[2:n-1];
  end loop;
  insert into public.partite(fase, giornata) values ('semifinale', 1), ('semifinale', 2), ('finale', 1);
  return cnt;
end $$;

create or replace function public.genera_semifinali(pin text) returns void language plpgsql security definer set search_path = '' as $$
declare top text[];
begin
  perform privato.richiedi_organizzatore(pin);
  if exists (select 1 from public.partite where fase = 'girone' and stato <> 'finita') then
    raise exception 'Il girone non è ancora finito';
  end if;
  select array_agg(c.squadra_id order by c.punti desc, c.diff_reti desc, c.gol_fatti desc, s.nome)
    into top from public.classifica c join public.squadre s on s.id = c.squadra_id;
  update public.partite set casa_id = top[1], ospite_id = top[4] where fase = 'semifinale' and giornata = 1 and stato = 'programmata';
  update public.partite set casa_id = top[2], ospite_id = top[3] where fase = 'semifinale' and giornata = 2 and stato = 'programmata';
end $$;

-- ---------- Permessi ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.torneo(text), public.admin_verifica(text), public.admin_aggiorna_partita(text, uuid, jsonb),
  public.admin_aggiungi_evento(text, uuid, text, uuid, uuid, int), public.admin_elimina_evento(text, uuid),
  public.admin_salva_giocatore(text, uuid, jsonb), public.admin_aggiungi_giocatore(text, text, text),
  public.admin_elimina_giocatore(text, uuid), public.admin_salva_impostazioni(text, text, text),
  public.admin_codice_accesso(text), public.admin_cambia_codice(text, text), public.admin_organizzatori(text),
  public.admin_aggiungi_organizzatore(text, text), public.admin_rimuovi_organizzatore(text, uuid),
  public.estrai_giocatore(text), public.azzera_sorteggio(text), public.genera_calendario(text), public.genera_semifinali(text)
to anon, authenticated;

-- ---------- Foto: bucket pubblico con percorsi non indovinabili; si carica solo via funzione server ----------
update storage.buckets set public = true where id = 'foto';
