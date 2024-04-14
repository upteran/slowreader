import type { TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import { createPostsPage } from '../posts-page.js'
import type { Loader } from './index.js'
import { findLinks, hasAnyFeed, toTime } from './utils.js'

// https://www.jsonfeed.org/version/1.1/
export type Author = {
  avatar?: string
  name?: string
  url?: string
}

export type Item = {
  /** deprecated from 1.1 version */
  author?: Author
  authors?: Author[]
  banner_image?: string
  content_html?: string
  content_text?: string
  date_modified?: string
  date_published?: string
  external_url?: string
  id: string
  image?: string
  summary?: string
  tags?: string[]
  title?: string
  url?: string
}

export type JsonFeed = {
  /** deprecated from 1.1 version */
  author?: Author
  authors?: Author[]
  description?: string
  favicon?: string
  feed_url?: string
  home_page_url?: string
  icon?: string
  items: Item[]
  next_url?: string
  title: string
  user_comment?: string
  version: string
}

type ValidationRules = {
  [key: string]: (value: unknown) => boolean
}

function isObjValid<ValidatedType>(
  obj: unknown,
  rules: ValidationRules
): obj is ValidatedType {
  if (typeof obj !== 'object' || obj === null) return false

  for (let field in rules) {
    if (!(field in obj) || !rules[field]!((obj as never)[field])) {
      // eslint-disable-next-line no-console
      console.error(
        `json ${field} field with value ${(obj as never)[field]} is not valid`
      )
      return false
    }
  }

  return true
}

let existJsonFeedVersions = ['1', '1.1']

let jsonFeedValidationRules: ValidationRules = {
  items: (value: unknown): boolean => Array.isArray(value),
  title: (value: unknown): boolean => typeof value === 'string',
  version: (value: unknown): boolean => {
    if (typeof value !== 'string' || !value.includes('jsonfeed')) return false
    let version = value.split('/').pop()
    return existJsonFeedVersions.includes(version!)
  }
}

function parsePosts(text: TextResponse): OriginPost[] {
  let parsedJson = text.parseJson()
  if (!isObjValid<JsonFeed>(parsedJson, jsonFeedValidationRules)) return []

  return parsedJson.items.map(item => ({
    full: (item.content_html || item.content_text) ?? undefined,
    intro: item.summary ?? undefined,
    media: [],
    originId: item.id,
    publishedAt: toTime(item.date_published) ?? undefined,
    title: item.title,
    url: item.url ?? undefined
  }))
}

export const jsonFeed: Loader = {
  getMineLinksFromText(text, found) {
    let links = findLinks(text, 'application/feed+json')
    if (links.length === 0) {
      links = findLinks(text, 'application/json')
    }
    if (links.length > 0) {
      return links
    } else if (!hasAnyFeed(text, found)) {
      let { origin } = new URL(text.url)
      return [new URL('/feed.json', origin).href]
    } else {
      return []
    }
  },

  getPosts(task, url, text) {
    if (text) {
      return createPostsPage(parsePosts(text), undefined)
    } else {
      return createPostsPage(undefined, async () => {
        return [parsePosts(await task.text(url)), undefined]
      })
    }
  },

  isMineText(text) {
    let parsedJson = text.parseJson()
    if (isObjValid<JsonFeed>(parsedJson, jsonFeedValidationRules)) {
      return parsedJson.title
    }
    return false
  },

  isMineUrl() {
    return undefined
  }
}
