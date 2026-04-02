'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Plus, Pin, Download, CheckSquare, Square, List, Eye, EyeOff } from 'lucide-react'

interface Video {
  id: string
  title: string
  description: string | null
  youtube_id: string
  tags: string[]
  pinned: boolean
  published: boolean
  published_at: string | null
  created_at: string
}

interface Playlist {
  id: string
  title: string
  videoCount: number
}

const SPECIAL_TAGS = ['botspeak', 'causal reasoning', 'ethical play', 'aimagineering', 'embodied teaching']

const EMPTY_FORM = {
  title: '',
  youtube_id: '',
  description: '',
  tags_input: '',
  pinned: false,
  published: true,
}

export default function VideosAdminPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit/Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Import dialog
  const [importOpen, setImportOpen] = useState(false)
  const [importInput, setImportInput] = useState('')
  const [importTags, setImportTags] = useState('')
  const [importAutoTag, setImportAutoTag] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null)

  // Playlist browser dialog
  const [playlistsOpen, setPlaylistsOpen] = useState(false)
  const [playlistInput, setPlaylistInput] = useState('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Tag filter
  const [filterTag, setFilterTag] = useState<string | null>(null)

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/videos')
      if (!res.ok) throw new Error('Failed to load videos')
      const data = await res.json()
      setVideos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading videos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  // --- Single video CRUD ---

  function openNew() {
    setEditingVideo(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
    clearMessages()
  }

  function openEdit(v: Video) {
    setEditingVideo(v)
    setForm({
      title: v.title,
      youtube_id: v.youtube_id,
      description: v.description || '',
      tags_input: (v.tags || []).join(', '),
      pinned: v.pinned,
      published: v.published,
    })
    setDialogOpen(true)
    clearMessages()
  }

  async function saveVideo() {
    setSaving(true)
    clearMessages()
    try {
      const tags = form.tags_input
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const payload = {
        title: form.title,
        youtube_id: form.youtube_id,
        description: form.description || null,
        tags,
        pinned: form.pinned,
        published: form.published,
      }

      const url = editingVideo
        ? `/api/admin/videos/${editingVideo.id}`
        : '/api/admin/videos'
      const method = editingVideo ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      setDialogOpen(false)
      fetchVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving video')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm('Delete this video?')) return
    clearMessages()
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      fetchVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting video')
    }
  }

  function addSpecialTag(tag: string) {
    const current = form.tags_input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    if (!current.includes(tag)) {
      setForm(prev => ({
        ...prev,
        tags_input: [...current, tag].join(', '),
      }))
    }
  }

  // --- YouTube Import ---

  function openImport() {
    setImportInput('')
    setImportTags('')
    setImportAutoTag('')
    setImportResult(null)
    setImportOpen(true)
    clearMessages()
  }

  async function runImport() {
    setImporting(true)
    clearMessages()
    setImportResult(null)
    try {
      const tags = importTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const res = await fetch('/api/admin/videos/import-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: importInput,
          tags,
          autoTag: importAutoTag || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      setImportResult(data)
      setSuccess(`Imported ${data.imported} videos (${data.skipped} already existed)`)
      fetchVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import error')
    } finally {
      setImporting(false)
    }
  }

  // --- Playlist Browser ---

  async function browsePlaylists() {
    setLoadingPlaylists(true)
    setPlaylists([])
    clearMessages()
    try {
      const res = await fetch('/api/admin/videos/youtube-playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: playlistInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch playlists')
      setPlaylists(data.playlists)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching playlists')
    } finally {
      setLoadingPlaylists(false)
    }
  }

  function importPlaylist(playlist: Playlist) {
    setPlaylistsOpen(false)
    setImportInput(`https://www.youtube.com/playlist?list=${playlist.id}`)
    setImportAutoTag(playlist.title.toLowerCase())
    setImportResult(null)
    setImportOpen(true)
  }

  // --- Bulk Operations ---

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const displayed = filteredVideos.map(v => v.id)
    setSelectedIds(new Set(displayed))
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  async function bulkDeleteSelected() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected video(s)?`)) return
    clearMessages()
    try {
      const res = await fetch('/api/admin/videos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed')
      setSuccess(`Deleted ${data.deleted} video(s)`)
      setSelectedIds(new Set())
      fetchVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete error')
    }
  }

  async function bulkDeleteByTag(tag: string) {
    const count = videos.filter(v => v.tags?.includes(tag)).length
    if (!confirm(`Delete all ${count} video(s) tagged "${tag}"?`)) return
    clearMessages()
    try {
      const res = await fetch('/api/admin/videos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed')
      setSuccess(`Deleted ${data.deleted} video(s) with tag "${tag}"`)
      setSelectedIds(new Set())
      fetchVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete error')
    }
  }

  async function bulkUpdatePublished(published: boolean, mode: 'selected' | 'tag') {
    const label = published ? 'Publish' : 'Unpublish'
    if (mode === 'selected') {
      if (selectedIds.size === 0) return
      if (!confirm(`${label} ${selectedIds.size} selected video(s)?`)) return
    } else if (mode === 'tag' && filterTag) {
      const count = videos.filter(v => v.tags?.includes(filterTag)).length
      if (!confirm(`${label} all ${count} video(s) tagged "${filterTag}"?`)) return
    }
    clearMessages()
    try {
      const payload: { ids?: string[]; tag?: string; published: boolean } = { published }
      if (mode === 'selected') payload.ids = Array.from(selectedIds)
      else if (mode === 'tag' && filterTag) payload.tag = filterTag

      const res = await fetch('/api/admin/videos/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${label} failed`)
      setSuccess(`${label}ed ${data.updated} video(s)`)
      if (mode === 'selected') setSelectedIds(new Set())
      fetchVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} error`)
    }
  }

  // --- Filtering ---

  const allTags = Array.from(new Set(videos.flatMap(v => v.tags || [])))
  const filteredVideos = filterTag
    ? videos.filter(v => v.tags?.includes(filterTag))
    : videos

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">Videos</h2>
          <p className="text-sm text-muted-foreground">
            Manage YouTube video embeds. Import from your channels or playlists.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setPlaylistInput(''); setPlaylists([]); setPlaylistsOpen(true); clearMessages() }} className="gap-2">
            <List className="h-4 w-4" />
            Browse Playlists
          </Button>
          <Button variant="outline" onClick={openImport} className="gap-2">
            <Download className="h-4 w-4" />
            Import from YouTube
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Video
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <button
            onClick={() => setFilterTag(null)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${!filterTag ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-input hover:bg-accent'}`}
          >
            All ({videos.length})
          </button>
          {allTags.sort().map(tag => {
            const count = videos.filter(v => v.tags?.includes(tag)).length
            return (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${filterTag === tag ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-input hover:bg-accent'}`}
              >
                {tag} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Bulk action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setSelectMode(!selectMode); selectNone() }}
          className="gap-2"
        >
          {selectMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {selectMode ? 'Done Selecting' : 'Select'}
        </Button>
        {selectMode && (
          <>
            <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="outline" size="sm" onClick={selectNone}>Deselect All</Button>
            {selectedIds.size > 0 && (
              <>
                <Button size="sm" onClick={() => bulkUpdatePublished(true, 'selected')} className="gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  Publish {selectedIds.size} Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => bulkUpdatePublished(false, 'selected')} className="gap-2">
                  <EyeOff className="h-3.5 w-3.5" />
                  Unpublish {selectedIds.size} Selected
                </Button>
                <Button variant="destructive" size="sm" onClick={bulkDeleteSelected} className="gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selectedIds.size} Selected
                </Button>
              </>
            )}
          </>
        )}
        {filterTag && (
          <>
            <Button size="sm" onClick={() => bulkUpdatePublished(true, 'tag')} className="gap-2">
              <Eye className="h-3.5 w-3.5" />
              Publish All &ldquo;{filterTag}&rdquo;
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkUpdatePublished(false, 'tag')} className="gap-2">
              <EyeOff className="h-3.5 w-3.5" />
              Unpublish All &ldquo;{filterTag}&rdquo;
            </Button>
            <Button variant="destructive" size="sm" onClick={() => bulkDeleteByTag(filterTag)} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              Delete All &ldquo;{filterTag}&rdquo;
            </Button>
          </>
        )}
      </div>

      {/* Video list */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filteredVideos.length === 0 ? (
        <p className="text-muted-foreground">
          {filterTag ? `No videos tagged "${filterTag}".` : 'No videos yet. Create one or import from YouTube.'}
        </p>
      ) : (
        <div className="grid gap-4">
          {filteredVideos.map(v => (
            <Card key={v.id} className={selectedIds.has(v.id) ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  {selectMode && (
                    <button onClick={() => toggleSelect(v.id)} className="mt-1">
                      {selectedIds.has(v.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                      {v.title}
                      {v.pinned && (
                        <Badge variant="default" className="gap-1">
                          <Pin className="h-3 w-3" /> Pinned
                        </Badge>
                      )}
                      <Badge variant={v.published ? 'secondary' : 'outline'}>
                        {v.published ? 'Published' : 'Draft'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{v.youtube_id}</Badge>
                      {v.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </CardDescription>
                    {v.description && (
                      <p className="text-sm text-muted-foreground pt-1 line-clamp-2">{v.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteVideo(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-md overflow-hidden max-w-sm">
                  <iframe
                    src={`https://www.youtube.com/embed/${v.youtube_id}`}
                    title={v.title}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    loading="lazy"
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'New Video'}</DialogTitle>
            <DialogDescription>
              {editingVideo ? 'Update the video details.' : 'Add a new video to the directory.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Title</Label>
              <Input
                id="video-title"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Introduction to Causal Reasoning"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-youtube-id">YouTube Video ID</Label>
              <Input
                id="video-youtube-id"
                value={form.youtube_id}
                onChange={e => setForm(prev => ({ ...prev, youtube_id: e.target.value }))}
                placeholder="e.g. hWgWmLWivpo"
              />
              <p className="text-xs text-muted-foreground">
                The ID from the YouTube URL (e.g. youtube.com/watch?v=<strong>hWgWmLWivpo</strong>)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-desc">Description</Label>
              <Textarea
                id="video-desc"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the video"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-tags">Tags (comma-separated)</Label>
              <Input
                id="video-tags"
                value={form.tags_input}
                onChange={e => setForm(prev => ({ ...prev, tags_input: e.target.value }))}
                placeholder="botspeak, causal reasoning"
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SPECIAL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addSpecialTag(tag)}
                    className="px-2 py-0.5 text-xs rounded-full border border-input hover:bg-accent transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(prev => ({ ...prev, pinned: e.target.checked }))}
                  className="rounded"
                />
                Pinned (always shown at top)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => setForm(prev => ({ ...prev, published: e.target.checked }))}
                  className="rounded"
                />
                Published
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVideo} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from YouTube</DialogTitle>
            <DialogDescription>
              Import videos from a YouTube channel or playlist as drafts. Duplicates are skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-input">Channel or Playlist URL</Label>
              <Input
                id="import-input"
                value={importInput}
                onChange={e => setImportInput(e.target.value)}
                placeholder="e.g. @YourChannel, youtube.com/playlist?list=PLxxx, or channel URL"
              />
              <p className="text-xs text-muted-foreground">
                Accepts: @handle, channel URL, playlist URL, or raw IDs
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-tags">Tags to apply (comma-separated, optional)</Label>
              <Input
                id="import-tags"
                value={importTags}
                onChange={e => setImportTags(e.target.value)}
                placeholder="e.g. botspeak, lecture"
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SPECIAL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = importTags.split(',').map(t => t.trim()).filter(Boolean)
                      if (!current.includes(tag)) setImportTags([...current, tag].join(', '))
                    }}
                    className="px-2 py-0.5 text-xs rounded-full border border-input hover:bg-accent transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-autotag">Auto-tag name (optional)</Label>
              <Input
                id="import-autotag"
                value={importAutoTag}
                onChange={e => setImportAutoTag(e.target.value)}
                placeholder="e.g. playlist name — added as a tag to all imported videos"
              />
            </div>

            {importResult && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><strong>Total found:</strong> {importResult.total}</p>
                <p><strong>Imported:</strong> {importResult.imported} (as drafts)</p>
                <p><strong>Skipped (duplicates):</strong> {importResult.skipped}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={importing || !importInput.trim()}>
              {importing ? 'Importing...' : 'Import as Drafts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Playlist Browser Dialog */}
      <Dialog open={playlistsOpen} onOpenChange={setPlaylistsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Browse Channel Playlists</DialogTitle>
            <DialogDescription>
              Enter a channel URL or @handle to see all playlists. Click one to import it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={playlistInput}
                onChange={e => setPlaylistInput(e.target.value)}
                placeholder="e.g. @YourChannel or channel URL"
                className="flex-1"
              />
              <Button onClick={browsePlaylists} disabled={loadingPlaylists || !playlistInput.trim()}>
                {loadingPlaylists ? 'Loading...' : 'Browse'}
              </Button>
            </div>

            {playlists.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => importPlaylist(pl)}
                    className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
                  >
                    <div className="font-medium text-sm">{pl.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {pl.videoCount} video{pl.videoCount !== 1 ? 's' : ''} &middot; {pl.id}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {loadingPlaylists && <p className="text-sm text-muted-foreground">Fetching playlists...</p>}
            {!loadingPlaylists && playlists.length === 0 && playlistInput && (
              <p className="text-sm text-muted-foreground">No playlists found. Click Browse to search.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaylistsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
