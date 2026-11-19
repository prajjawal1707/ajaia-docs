import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileText, Plus, Search, Upload, Users, Clock3, MoreHorizontal, Trash2,
  ChevronLeft, Share2, Check, Cloud, Bold, Italic, Underline, List,
  ListOrdered, Heading1, Heading2, X, LoaderCircle, LogOut, FilePlus2,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExtension from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { api, setToken, emptyContent } from './api'
import type { Doc, Share, User } from './types'

type Toast = { text: string; kind?: 'error' | 'success' }

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [active, setActive] = useState<Doc | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'owned' | 'shared'>('all')
  const [shareOpen, setShareOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  const notify = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    setToast({ text, kind })
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  const refreshDocs = useCallback(async () => {
    const rows = await api.listDocs()
    setDocs(rows)
  }, [])

  useEffect(() => {
    api.me()
      .then(async u => { setUser(u); await refreshDocs() })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [refreshDocs])

  const openDoc = async (id: string) => {
    try {
      const doc = await api.getDoc(id)
      setActive(doc)
      setSaveState('saved')
    } catch (e) { notify((e as Error).message, 'error') }
  }

  const createDoc = async () => {
    try {
      const doc = await api.createDoc()
      await refreshDocs()
      setActive(doc)
      notify('Document created')
    } catch (e) { notify((e as Error).message, 'error') }
  }

  const handleUpload = async (file?: File) => {
    if (!file) return
    if (!/\.(txt|md)$/i.test(file.name)) {
      notify('Please upload a .txt or .md file.', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      notify('File must be smaller than 2 MB.', 'error')
      return
    }
    try {
      const doc = await api.upload(file)
      await refreshDocs()
      setActive(doc)
      notify('File imported as a document')
    } catch (e) { notify((e as Error).message, 'error') }
  }

  const signIn = async (email: string) => {
    try {
      const result = await api.login(email)
      setToken(result.access_token)
      setUser(result.user)
      await refreshDocs()
    } catch (e) { notify((e as Error).message, 'error') }
  }

  const signOut = () => {
    setToken('')
    setUser(null)
    setDocs([])
    setActive(null)
  }

  const filtered = useMemo(() => docs.filter(d => {
    const matches = d.title.toLowerCase().includes(query.toLowerCase())
    const isOwned = d.permission === 'owner' || d.owner_id === user?.id
    return matches && (tab === 'all' || (tab === 'owned' && isOwned) || (tab === 'shared' && !isOwned))
  }), [docs, query, tab, user])

  if (loading) return <div className="center-screen"><LoaderCircle className="spin" /> Loading Ajaia Docs…</div>
  if (!user) return <Login onLogin={signIn} />

  return (
    <div className="app-shell">
      {active ? (
        <DocumentEditor
          doc={active}
          user={user}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          onBack={() => { setActive(null); refreshDocs().catch(e => notify(e.message, 'error')) }}
          onShare={() => setShareOpen(true)}
          onSaved={async updated => {
            setActive(updated)
            setSaveState('saved')
            await refreshDocs()
          }}
          onSaving={() => setSaveState('saving')}
          onError={message => notify(message, 'error')}
          saveState={saveState}
        />
      ) : (
        <Dashboard
          user={user}
          docs={filtered}
          query={query}
          tab={tab}
          onQuery={setQuery}
          onTab={setTab}
          onCreate={createDoc}
          onOpen={openDoc}
          onUpload={handleUpload}
          onSignOut={signOut}
          onDelete={async id => {
            if (!window.confirm('Delete this document permanently?')) return
            try { await api.deleteDoc(id); await refreshDocs(); notify('Document deleted') }
            catch (e) { notify((e as Error).message, 'error') }
          }}
        />
      )}
      {shareOpen && active && <ShareDialog doc={active} onClose={() => setShareOpen(false)} onChanged={refreshDocs} notify={notify} />}
      {toast && <div className={`toast ${toast.kind || ''}`}>{toast.kind === 'error' ? <X size={16}/> : <Check size={16}/>} {toast.text}</div>}
    </div>
  )
}

function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState('alex@ajaia.demo')
  const [busy, setBusy] = useState(false)
  const choose = async (value: string) => { setEmail(value); setBusy(true); await onLogin(value); setBusy(false) }
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark"><FileText size={22}/></div>
        <p className="eyebrow">AJAIA WORKSPACE</p>
        <h1>Make space for<br/><span>good work.</span></h1>
        <p className="muted">A calm place to create, organize, and share documents with your team.</p>
        <label className="field-label" htmlFor="email">Demo account email</label>
        <input id="email" className="text-input" value={email} onChange={e => setEmail(e.target.value)} />
        <button className="primary-btn full" disabled={busy || !email.includes('@')} onClick={() => choose(email)}>
          {busy ? <LoaderCircle className="spin" size={17}/> : null} Continue
        </button>
        <div className="demo-users">
          <span>TRY A SEEDED USER</span>
          <button onClick={() => choose('alex@ajaia.demo')}>Alex Morgan</button>
          <button onClick={() => choose('sam@ajaia.demo')}>Sam Rivera</button>
        </div>
        <p className="tiny muted">Demo sign-in for evaluation. No password required.</p>
      </div>
    </div>
  )
}

function Dashboard(props: {
  user: User; docs: Doc[]; query: string; tab: 'all'|'owned'|'shared'
  onQuery: (v: string) => void; onTab: (v: 'all'|'owned'|'shared') => void
  onCreate: () => void; onOpen: (id: string) => void; onUpload: (f?: File) => void
  onSignOut: () => void; onDelete: (id: string) => void
}) {
  const fileRef = useState<HTMLInputElement | null>(null)
  const inputRef = fileRef[0]
  const setInputRef = fileRef[1]
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark small"><FileText size={17}/></div><span>ajaia<span className="brand-light">docs</span></span></div>
        <button className="new-doc-btn" onClick={props.onCreate}><Plus size={17}/> New document</button>
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-item ${props.tab === 'all' ? 'selected' : ''}`} onClick={() => props.onTab('all')}><FileText size={17}/> All documents</button>
        <button className={`nav-item ${props.tab === 'owned' ? 'selected' : ''}`} onClick={() => props.onTab('owned')}><Clock3 size={17}/> Owned by me</button>
        <button className={`nav-item ${props.tab === 'shared' ? 'selected' : ''}`} onClick={() => props.onTab('shared')}><Users size={17}/> Shared with me</button>
        <div className="sidebar-bottom">
          <div className="user-card"><div className="avatar">{initials(props.user.name)}</div><div className="user-info"><strong>{props.user.name}</strong><span>{props.user.email}</span></div><button className="icon-btn" title="Sign out" onClick={props.onSignOut}><LogOut size={16}/></button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div><span className="breadcrumb">Workspace</span><span className="crumb-sep">/</span><strong>Documents</strong></div><div className="top-actions"><span className="avatar">{initials(props.user.name)}</span></div></header>
        <section className="content-wrap">
          <div className="welcome-row"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Good work starts here.</h1><p className="muted">Create something new or pick up where you left off.</p></div><button className="primary-btn" onClick={props.onCreate}><Plus size={17}/> Create document</button></div>
          <div className="quick-actions">
            <button className="quick-card" onClick={props.onCreate}><div className="quick-icon lavender"><FilePlus2 size={20}/></div><div><strong>Blank document</strong><span>Start with a clean page</span></div><Plus size={17} className="quick-plus"/></button>
            <button className="quick-card" onClick={() => inputRef?.click()}><div className="quick-icon mint"><Upload size={20}/></div><div><strong>Import a file</strong><span>Bring in a .txt or .md file</span></div><Plus size={17} className="quick-plus"/></button>
            <input ref={setInputRef} hidden type="file" accept=".txt,.md,text/plain,text/markdown" onChange={e => { props.onUpload(e.target.files?.[0]); e.currentTarget.value = '' }} />
          </div>
          <div className="section-heading"><div><h2>Recent documents</h2><span className="muted small-text">{props.docs.length} documents</span></div><div className="search-wrap"><Search size={16}/><input value={props.query} onChange={e => props.onQuery(e.target.value)} placeholder="Search documents"/></div></div>
          {props.docs.length ? (
            <div className="doc-grid">{props.docs.map(doc => <article className="doc-card" key={doc.id} onClick={() => props.onOpen(doc.id)}>
              <div className="doc-preview"><div className="preview-lines"><b></b><i></i><i></i><i></i><i></i></div><span className="doc-type"><FileText size={14}/></span></div>
              <div className="doc-card-info"><div className="doc-title-row"><h3>{doc.title}</h3><button className="icon-btn" title="Delete document" onClick={e => { e.stopPropagation(); props.onDelete(doc.id) }}><MoreHorizontal size={18}/></button></div><p>{doc.permission === 'owner' || doc.owner_id === props.user.id ? 'Owned by you' : `Shared by ${doc.owner_name || 'a teammate'}`}</p><div className="doc-meta"><span><Clock3 size={13}/> {formatDate(doc.updated_at)}</span>{doc.permission && doc.permission !== 'owner' && <span className="permission-tag">{doc.permission}</span>}</div></div>
            </article>)}</div>
          ) : <div className="empty-state"><div className="empty-icon"><FileText size={25}/></div><h3>No documents found</h3><p className="muted">Create a document or import a text file to get started.</p><button className="primary-btn" onClick={props.onCreate}><Plus size={16}/> Create your first document</button></div>}
          <div className="storage-note"><Cloud size={15}/> Your documents are saved to your workspace.</div>
        </section>
      </main>
    </div>
  )
}

function DocumentEditor(props: {
  doc: Doc; user: User; sidebarOpen: boolean; onToggleSidebar: () => void; onBack: () => void
  onShare: () => void; onSaved: (doc: Doc) => void; onSaving: () => void
  onError: (message: string) => void; saveState: 'saved'|'saving'|'unsaved'
}) {
  const [title, setTitle] = useState(props.doc.title)
  const [titleEditing, setTitleEditing] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const editor = useEditor({
    extensions: [StarterKit, UnderlineExtension, Placeholder.configure({ placeholder: 'Start writing your document…' })],
    content: props.doc.content || emptyContent,
    editorProps: { attributes: { class: 'tiptap-editor', spellcheck: 'true' } },
    onUpdate: ({ editor }) => {
      setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length)
      scheduleSave(editor.getJSON(), title)
    },
  })

  const scheduleSave = useMemo(() => {
    let timer: number | undefined
    return (content: Record<string, unknown>, nextTitle: string) => {
      props.onSaving()
      window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        try {
          const saved = await api.updateDoc(props.doc.id, { title: nextTitle, content })
          props.onSaved(saved)
        } catch (e) { props.onError((e as Error).message) }
      }, 850)
    }
  }, [props.doc.id, props.onSaved, props.onSaving, props.onError])

  useEffect(() => {
    if (editor) setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length)
  }, [editor])

  useEffect(() => {
    setTitle(props.doc.title)
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(props.doc.content)) {
      editor.commands.setContent(props.doc.content || emptyContent)
    }
  }, [props.doc.id])

  const saveTitle = async () => {
    setTitleEditing(false)
    try {
      const saved = await api.updateDoc(props.doc.id, { title: title.trim() || 'Untitled document' })
      props.onSaved(saved)
    } catch (e) { props.onError((e as Error).message) }
  }

  if (!editor) return <div className="center-screen">Opening editor…</div>
  const tool = (label: string, icon: React.ReactNode, active: boolean, action: () => void) => (
    <button title={label} className={`tool-btn ${active ? 'active' : ''}`} onClick={action}>{icon}</button>
  )
  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <div className="editor-brand">
          <button className="icon-btn" onClick={props.onToggleSidebar} title="Toggle sidebar">{props.sidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}</button>
          <button className="icon-btn" onClick={props.onBack} title="Back to documents"><ChevronLeft size={19}/></button>
          <div className="brand-mark tiny-mark"><FileText size={16}/></div>
          <div className="title-area">
            {titleEditing ? <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={e => e.key === 'Enter' && saveTitle()} /> : <button className="title-button" onClick={() => setTitleEditing(true)}>{title || 'Untitled document'}</button>}
            <span className="save-indicator">{props.saveState === 'saving' ? <><LoaderCircle className="spin" size={12}/> Saving…</> : <><Check size={12}/> Saved</>}</span>
          </div>
        </div>
        <div className="editor-actions"><button className="secondary-btn" onClick={props.onShare}><Users size={16}/> Share</button><div className="avatar">{initials(props.user.name)}</div></div>
      </header>
      {props.sidebarOpen && <aside className="editor-sidebar"><div className="side-label">DOCUMENT</div><button className="nav-item selected"><FileText size={16}/> Current document</button><div className="editor-sidebar-note">Changes save automatically as you type.</div></aside>}
      <main className={`editor-main ${props.sidebarOpen ? 'with-sidebar' : ''}`}>
        <div className="format-toolbar">
          {tool('Bold', <Bold size={17}/>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
          {tool('Italic', <Italic size={17}/>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
          {tool('Underline', <Underline size={17}/>, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
          <span className="toolbar-divider"/>
          {tool('Heading 1', <Heading1 size={18}/>, editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          {tool('Heading 2', <Heading2 size={18}/>, editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          <span className="toolbar-divider"/>
          {tool('Bulleted list', <List size={18}/>, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
          {tool('Numbered list', <ListOrdered size={18}/>, editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
          <span className="toolbar-spacer"/>
          <span className="toolbar-hint">Formatting</span>
        </div>
        <div className="paper-wrap"><div className="paper"><EditorContent editor={editor}/></div></div>
        <footer className="editor-footer"><span>{wordCount} words</span><span>All changes are saved to Ajaia Docs</span></footer>
      </main>
    </div>
  )
}

function ShareDialog({ doc, onClose, onChanged, notify }: {
  doc: Doc; onClose: () => void; onChanged: () => Promise<void>; notify: (t: string, k?: 'error'|'success') => void
}) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'viewer'|'editor'>('editor')
  const [shares, setShares] = useState<Share[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.shares(doc.id).then(setShares).catch(e => notify(e.message, 'error')) }, [doc.id])
  const invite = async () => {
    if (!email.includes('@')) { notify('Enter a valid email address', 'error'); return }
    setBusy(true)
    try {
      const share = await api.grantShare(doc.id, email.trim(), permission)
      setShares(old => [...old.filter(s => s.user_id !== share.user_id), share])
      setEmail('')
      await onChanged()
      notify('Document shared successfully')
    } catch (e) { notify((e as Error).message, 'error') }
    finally { setBusy(false) }
  }
  const remove = async (userId: string) => {
    try { await api.removeShare(doc.id, userId); setShares(old => old.filter(s => s.user_id !== userId)); notify('Access removed') }
    catch (e) { notify((e as Error).message, 'error') }
  }
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="share-modal">
        <div className="modal-header"><div><h2>Share document</h2><p className="muted">Invite teammates to collaborate on <strong>{doc.title}</strong>.</p></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>
        <div className="invite-row"><input className="text-input" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && invite()}/><select value={permission} onChange={e => setPermission(e.target.value as 'viewer'|'editor')}><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button className="primary-btn" disabled={busy} onClick={invite}>{busy ? 'Sharing…' : 'Share'}</button></div>
        <div className="share-list-title">People with access <span>{shares.length}</span></div>
        {shares.length ? shares.map(s => <div className="share-person" key={s.user_id}><div className="avatar">{initials(s.user_name || s.email)}</div><div className="person-info"><strong>{s.user_name}</strong><span>{s.email}</span></div><span className="permission-label">{s.permission}</span><button className="icon-btn" title="Remove access" onClick={() => remove(s.user_id)}><X size={16}/></button></div>) : <p className="muted empty-share">This document hasn't been shared yet.</p>}
        <div className="share-footnote"><Users size={15}/> Only invited people can access this document.</div>
      </div>
    </div>
  )
}

function initials(name: string) { return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || 'A' }
function formatDate(value: string) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export default App
