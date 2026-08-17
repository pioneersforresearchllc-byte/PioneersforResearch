import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

/** Self-contained contact form (dark theme). Inserts into contact_messages,
 * which the owner reads in the dashboard's "Contact Messages" tab. */
export function ContactForm() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(t('home.contact.error'))
      return
    }
    const { error: err } = await supabase
      .from('contact_messages')
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() })
    if (err) {
      setError(t('home.contact.errorSubmit'))
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-white/20 bg-white/8 p-6 text-center text-[15px]">
        {t('home.contact.success')}
      </div>
    )
  }

  const field =
    'rounded-md border border-white/30 bg-white/5 px-4 py-3.25 text-[14.5px] text-white placeholder:text-white/60'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <input type="text" placeholder={t('home.contact.namePh')} value={name} onChange={(e) => setName(e.target.value)} className={field} />
      <input type="email" placeholder={t('home.contact.emailPh')} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      <textarea
        placeholder={t('home.contact.messagePh')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className={`resize-y ${field}`}
      />
      {error && <div className="text-[13.5px] text-[#e8b4ac]">{error}</div>}
      <button type="submit" className="rounded-md bg-gold py-3.25 text-[15px] font-semibold text-navy hover:bg-gold-light">
        {t('home.contact.send')}
      </button>
    </form>
  )
}
