import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/lib/i18n'
import {
  amInstitutionAdmin,
  createInstitutionMember,
  listInstitutionMembers,
  removeInstitutionMember,
  type InstitutionMember,
  type MemberRole,
} from '@/lib/institutions'

export function InstitutionTeamPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: isAdmin } = useQuery({ queryKey: ['is-institution-admin'], queryFn: amInstitutionAdmin })
  const { data: members } = useQuery({ queryKey: ['institution-members'], queryFn: listInstitutionMembers })

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memberRole, setMemberRole] = useState<MemberRole>('member')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['institution-members'] })

  const add = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || password.length < 6) {
      setError(t('instTeam.fillFields'))
      setMessage('')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await createInstitutionMember({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        memberRole,
      })
      setName('')
      setUsername('')
      setEmail('')
      setPassword('')
      setMemberRole('member')
      setMessage(t('instTeam.added'))
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('instTeam.fillFields'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m: InstitutionMember) => {
    if (!confirm(t('instTeam.confirmRemove'))) return
    await removeInstitutionMember(m.id)
    refresh()
  }

  const roleLabel = (r: MemberRole) =>
    r === 'admin' ? t('instTeam.roleAdmin') : r === 'coordinator' ? t('instTeam.roleCoordinator') : t('instTeam.roleMember')

  const inputClass = 'w-full rounded-md border border-border px-3.5 py-2.5 text-[14px]'

  return (
    <div className="max-w-160">
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('instTeam.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('instTeam.subtitle')}</div>

      {isAdmin ? (
        <div className="mb-8 rounded-xl border border-border bg-bg-soft p-4">
          <div className="mb-3 text-[14px] font-semibold text-navy">{t('instTeam.addTitle')}</div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('instTeam.namePh')} className={inputClass} />
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('instTeam.usernamePh')} className={inputClass} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('instTeam.emailPh')} className={inputClass} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('instTeam.passwordPh')} className={inputClass} />
            <label className="flex flex-col gap-1 text-[11.5px] text-muted sm:col-span-2">
              {t('instTeam.role')}
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as MemberRole)} className={inputClass}>
                <option value="member">{t('instTeam.roleMember')}</option>
                <option value="coordinator">{t('instTeam.roleCoordinator')}</option>
                <option value="admin">{t('instTeam.roleAdmin')}</option>
              </select>
            </label>
          </div>
          {error && <div className="mt-2 text-[13px] text-error">{error}</div>}
          {message && <div className="mt-2 text-[13px] text-success">{message}</div>}
          <button
            onClick={() => void add()}
            disabled={busy}
            className="mt-3 rounded-md bg-navy px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {busy ? t('instTeam.adding') : t('instTeam.add')}
          </button>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-border bg-bg-soft p-4 text-[13.5px] text-muted">
          {t('instTeam.notAdmin')}
        </div>
      )}

      <div className="mb-3 text-[15px] font-semibold text-navy">{t('instTeam.membersTitle')}</div>
      {members && members.length === 0 && <div className="text-muted">{t('instTeam.empty')}</div>}
      <div className="flex flex-col gap-2.5">
        {(members ?? []).map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4">
            <div>
              <div className="text-[14.5px] font-semibold text-navy">{m.name || '—'}</div>
              <div className="text-[12.5px] text-muted">@{m.username}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-bg-soft px-2.5 py-1 text-[11.5px] font-semibold text-navy">
                {roleLabel(m.member_role)}
              </span>
              {isAdmin && (
                <button
                  onClick={() => void remove(m)}
                  className="rounded-md border border-error px-3 py-1.5 text-[12px] text-error hover:bg-error-bg"
                >
                  {t('instTeam.remove')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
