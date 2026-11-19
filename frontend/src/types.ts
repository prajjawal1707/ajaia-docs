export type User = { id: string; name: string; email: string }
export type Permission = 'viewer' | 'editor'
export type Share = { user_id: string; user_name: string; email: string; permission: Permission }
export type Doc = {
  id: string
  title: string
  content: Record<string, unknown>
  owner_id: string
  owner_name?: string
  updated_at: string
  created_at?: string
  permission?: Permission | 'owner'
}
