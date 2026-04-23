export type TextLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body'

export type ListBlockStyle = 'bullet' | 'numbered'

export type EmailBlock =
  | { id: string; type: 'Logo'; url: string; width?: number; link?: string }
  | { id: string; type: 'Text'; content: string; level: TextLevel }
  | { id: string; type: 'Button'; content: string; url: string }
  | { id: string; type: 'Image'; url: string; alt: string }
  | { id: string; type: 'Hr' }
  | { id: string; type: 'List'; items: string[]; style: ListBlockStyle }
  | { id: string; type: 'TwoColumn'; leftContent: string; rightContent: string }
  | { id: string; type: 'SnsShare'; platforms: string[] }
  | { id: string; type: 'SnsLinks'; links: { platform: string; url: string }[] }
  | {
      id: string
      type: 'VideoPreview'
      videoUrl: string
      thumbnailUrl?: string
      title?: string
    }
  | { id: string; type: 'Html'; code: string }
  | {
      id: string
      type: 'Footer'
      companyName?: string
      address?: string
      unsubscribeUrl?: string
    }
  | { id: string; type: 'Spacer'; height: number }

export interface EmailFormData {
  fromName: string
  subject: string
  previewText: string
  brandColor: string
  logoUrl: string
  blocks: EmailBlock[]
}

export type EditorMode = 'edit' | 'preview' | 'html'
export type PreviewDevice = 'desktop' | 'mobile'
export type RightPanelMode = 'edit' | 'ai'
export type EditTab = 'add' | 'editBlock'
