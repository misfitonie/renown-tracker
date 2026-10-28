-- Un compte = un profil (le personnage du joueur)

-- S'il reste plusieurs profils sur un compte, on garde le plus récemment modifié
delete from public.players p
using public.players newer
where p.user_id = newer.user_id
  and (p.updated_at, p.id) < (newer.updated_at, newer.id);

alter table public.players
  add constraint players_one_per_account unique (user_id);
