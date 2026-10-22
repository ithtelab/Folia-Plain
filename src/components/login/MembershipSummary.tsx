import { Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProviderUser } from '../../types/onlineMusic';

// Show provider-normalized membership details without inferring an expiry from a VIP badge.
export default function MembershipSummary({ user, mode = 'both' }: { user: ProviderUser; mode?: 'badge' | 'expiry' | 'both' }) {
    const { t, i18n } = useTranslation();
    const membership = user.membership;
    if (!membership && !user.vipType) return null;
    const name = t(membership?.tier === 'svip' ? 'account.membershipSvip' : membership?.tier === 'music-package' ? 'account.membershipMusicPackage' : 'account.membershipVip');
    const level = membership?.level ? ` · Lv.${membership.level}` : '';
    const date = membership?.expiresAt ? new Intl.DateTimeFormat(i18n.resolvedLanguage || 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(membership.expiresAt) : null;
    const expiry = date ? t(membership?.active === false ? 'account.membershipExpired' : 'account.membershipExpires', { date }) : t('account.membershipExpiryUnknown');
    return <span className={mode === 'expiry' ? 'block text-xs leading-[18px] text-[color:var(--st-t2)]' : 'inline-flex flex-wrap items-center gap-x-2 gap-y-0.5'}>
        {mode !== 'expiry' && <span title={expiry} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--st-warn)]"><Crown size={11} />{name}{level}{membership?.active === false ? ` · ${t('account.membershipInactive')}` : ''}</span>}
        {mode !== 'badge' && <span className="text-xs font-normal text-[color:var(--st-t2)]">{expiry}</span>}
    </span>;
}
