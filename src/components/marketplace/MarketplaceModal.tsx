import { useCallback, useEffect, useState } from 'react';
import { X, ChevronLeft, Search, Heart, Store, Share2, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Faction, Quest } from '../../types';
import { IconImage } from '../IconImage';
import { TagChips } from './TagChips';
import { PseudoForm } from './PseudoForm';
import { MarketplaceDetail } from './MarketplaceDetail';
import { MarketplacePublish } from './MarketplacePublish';
import { FactionTemplate, MarketplaceTag, SharedFaction } from '../../utils/marketplace';
import {
  MarketplaceError,
  MarketplaceSort,
  fetchMyPseudo,
  fetchMyReactions,
  fetchSharedFactions,
  publishFaction,
  reportFaction,
  setLike,
  unpublishFaction,
} from '../../lib/marketplace';
import { ToastType } from '../../hooks/useToast';

type View =
  | { name: 'browse' }
  | { name: 'detail'; faction: SharedFaction }
  | { name: 'publish' }
  | { name: 'pseudo' }; // choix du pseudo, puis publication

type Tab = 'explore' | 'mine';

interface MarketplaceModalProps {
  userId: string | null; // null : mode sans compte (consultation et installation seulement)
  factions: Faction[];
  quests: Quest[];
  publishFactionId?: string; // ouvre directement la publication de cette faction
  onInstall: (faction: SharedFaction) => void;
  onSignIn?: () => void;
  onClose: () => void;
  showToast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

export function MarketplaceModal({
  userId,
  factions,
  quests,
  publishFactionId,
  onInstall,
  onSignIn,
  onClose,
  showToast,
  confirm,
}: MarketplaceModalProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>({ name: 'browse' });
  const [tab, setTab] = useState<Tab>('explore');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<MarketplaceTag | null>(null);
  const [sort, setSort] = useState<MarketplaceSort>('popular');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<SharedFaction[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [pseudo, setPseudo] = useState<string | null | undefined>(undefined); // undefined : pas encore chargé
  const [publishing, setPublishing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const errorMessage = (err: unknown) => t(`marketplace.error.${err instanceof MarketplaceError ? err.code : 'unknown'}`);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Recherche lancée 300 ms après la dernière frappe
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setPage(0), [search, tag, sort, tab]);

  useEffect(() => {
    if (!userId) { setPseudo(null); return; }
    fetchMyPseudo(userId).then(setPseudo).catch(() => setPseudo(null));
  }, [userId]);

  // Liste des factions (la page 0 remplace la liste, les suivantes s'ajoutent)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchSharedFactions({ search, tag, sort, page, mine: tab === 'mine' ? userId : null })
      .then(async result => {
        if (cancelled) return;
        setItems(prev => (page === 0 ? result.items : [...prev, ...result.items]));
        setHasMore(result.hasMore);
        if (userId) {
          const reactions = await fetchMyReactions(result.items.map(f => f.id));
          if (cancelled) return;
          setLiked(prev => new Set([...(page === 0 ? [] : prev), ...reactions.liked]));
          setReported(prev => new Set([...(page === 0 ? [] : prev), ...reactions.reported]));
        }
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, tag, sort, page, tab, userId, reloadKey]);

  // Publier demande un pseudo public : on le fait choisir d'abord
  const openPublish = useCallback(() => {
    setView(pseudo ? { name: 'publish' } : { name: 'pseudo' });
  }, [pseudo]);

  // Ouverture directe depuis le bouton « Publier » d'une faction, une fois le pseudo connu
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (!publishFactionId || autoOpened || !userId || pseudo === undefined) return;
    setAutoOpened(true);
    openPublish();
  }, [publishFactionId, autoOpened, userId, pseudo, openPublish]);

  const updateItem = (id: string, patch: Partial<SharedFaction>) => {
    setItems(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
    setView(v => (v.name === 'detail' && v.faction.id === id ? { ...v, faction: { ...v.faction, ...patch } } : v));
  };

  const handleToggleLike = async (faction: SharedFaction) => {
    if (!userId || faction.authorId === userId) return;
    const next = !liked.has(faction.id);
    const apply = (value: boolean, count: number) => {
      setLiked(prev => { const s = new Set(prev); if (value) s.add(faction.id); else s.delete(faction.id); return s; });
      updateItem(faction.id, { likesCount: count });
    };
    apply(next, Math.max(0, faction.likesCount + (next ? 1 : -1)));
    try {
      await setLike(faction.id, next);
    } catch (err) {
      apply(!next, faction.likesCount);
      showToast(errorMessage(err), 'error');
    }
  };

  const handleReport = async (faction: SharedFaction, reason: string) => {
    try {
      await reportFaction(faction.id, reason);
      setReported(prev => new Set(prev).add(faction.id));
      showToast(t('marketplace.report.thanks'), 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const handleUnpublish = async (faction: SharedFaction) => {
    if (!(await confirm(t('marketplace.unpublishConfirm')))) return;
    try {
      await unpublishFaction(faction.id);
      setItems(prev => prev.filter(f => f.id !== faction.id));
      setView({ name: 'browse' });
      showToast(t('marketplace.unpublished'), 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const handlePublish = async (template: FactionTemplate) => {
    setPublishing(true);
    try {
      await publishFaction(template);
      showToast(t('marketplace.published'), 'success');
      setTab('mine');
      setSort('recent');
      setView({ name: 'browse' });
      setReloadKey(k => k + 1);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setPublishing(false);
    }
  };

  const title =
    view.name === 'detail' ? view.faction.name
    : view.name === 'publish' ? t('marketplace.publish.title')
    : view.name === 'pseudo' ? t('marketplace.pseudo.title')
    : t('marketplace.title');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative bg-bg-card border border-gray-700 rounded-xl p-5 sm:p-6 w-full max-w-3xl shadow-2xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {view.name !== 'browse' && (
              <button onClick={() => setView({ name: 'browse' })} className="text-gray-400 hover:text-white transition-colors" title={t('transfer.back')}>
                <ChevronLeft size={20} />
              </button>
            )}
            {view.name === 'browse' && <Store size={20} className="text-accent-gold flex-shrink-0" />}
            <h2 className="text-xl font-title text-accent-gold truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {view.name === 'detail' && (
            <MarketplaceDetail
              faction={view.faction}
              isMine={view.faction.authorId === userId}
              liked={liked.has(view.faction.id)}
              reported={reported.has(view.faction.id)}
              canInteract={!!userId}
              onInstall={() => onInstall(view.faction)}
              onToggleLike={() => handleToggleLike(view.faction)}
              onReport={reason => handleReport(view.faction, reason)}
              onUnpublish={() => handleUnpublish(view.faction)}
            />
          )}

          {view.name === 'pseudo' && userId && (
            <PseudoForm
              userId={userId}
              current={pseudo ?? null}
              onSaved={value => { setPseudo(value); setView({ name: 'publish' }); }}
              onCancel={() => setView({ name: 'browse' })}
            />
          )}

          {view.name === 'publish' && pseudo && (
            <MarketplacePublish
              factions={factions}
              quests={quests}
              initialFactionId={publishFactionId}
              pseudo={pseudo}
              publishing={publishing}
              onPublish={handlePublish}
              onEditPseudo={() => setView({ name: 'pseudo' })}
            />
          )}

          {view.name === 'browse' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-gray-700 overflow-hidden text-sm">
                  {(['explore', 'mine'] as const).map(id => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      disabled={id === 'mine' && !userId}
                      className={`px-3 py-1.5 transition-colors disabled:opacity-40 ${tab === id ? 'bg-accent-purple/20 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      {t(`marketplace.tabs.${id}`)}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                {userId ? (
                  <button
                    onClick={openPublish}
                    disabled={factions.length === 0 || pseudo === undefined}
                    className="flex items-center gap-1.5 bg-accent-purple hover:bg-accent-purple/80 text-on-accent font-semibold px-3 py-1.5 rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    <Share2 size={14} />
                    {t('marketplace.publish.button')}
                  </button>
                ) : onSignIn && (
                  <button onClick={onSignIn} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                    <LogIn size={14} />
                    {t('marketplace.signInToPublish')}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    maxLength={60}
                    placeholder={t('marketplace.searchPlaceholder')}
                    className="w-full bg-bg-dark border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as MarketplaceSort)}
                  className="bg-bg-dark border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
                >
                  <option value="popular">{t('marketplace.sort.popular')}</option>
                  <option value="recent">{t('marketplace.sort.recent')}</option>
                </select>
              </div>

              <TagChips selected={tag ? [tag] : []} onToggle={value => setTag(prev => (prev === value ? null : value))} />

              {loadError ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-sm text-red-400">{t('marketplace.error.load')}</p>
                  <button onClick={() => setReloadKey(k => k + 1)} className="text-sm text-gray-400 hover:text-white underline">
                    {t('marketplace.retry')}
                  </button>
                </div>
              ) : !loading && items.length === 0 ? (
                <p className="text-center text-sm text-gray-500 italic py-10">
                  {t(tab === 'mine' ? 'marketplace.emptyMine' : 'marketplace.empty')}
                </p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map(faction => (
                    <li key={faction.id}>
                      <button
                        onClick={() => setView({ name: 'detail', faction })}
                        className="w-full h-full text-left p-3 rounded-xl border border-gray-700 bg-bg-dark hover:border-gray-500 transition-colors flex flex-col gap-2"
                        style={{ borderLeftColor: faction.color, borderLeftWidth: 4 }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <IconImage image={faction.image ?? undefined} emoji={faction.icon} className="text-2xl leading-none" imageClassName="w-8 h-8" />
                          <div className="min-w-0 flex-1">
                            <p className="font-title text-white truncate">{faction.name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {t('marketplace.cardMeta', { pseudo: faction.authorPseudo, count: faction.quests.length })}
                            </p>
                          </div>
                          <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${liked.has(faction.id) ? 'text-pink-400' : 'text-gray-500'}`}>
                            <Heart size={12} className={liked.has(faction.id) ? 'fill-current' : ''} />
                            {faction.likesCount}
                          </span>
                        </div>
                        {faction.description && <p className="text-xs text-gray-400 line-clamp-2 break-words">{faction.description}</p>}
                        <div className="flex flex-wrap gap-1">
                          {faction.hidden && <span className="text-xs px-2 py-0.5 rounded-full border border-orange-500/50 text-orange-400">{t('marketplace.hiddenBadge')}</span>}
                          {faction.tags.map(value => (
                            <span key={value} className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400">
                              {t(`marketplace.tags.${value}`)}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {loading && <p className="text-center text-sm text-gray-500 py-4">{t('marketplace.loading')}</p>}
              {!loading && hasMore && !loadError && (
                <div className="text-center">
                  <button onClick={() => setPage(p => p + 1)} className="text-sm text-gray-400 hover:text-white underline">
                    {t('marketplace.loadMore')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
