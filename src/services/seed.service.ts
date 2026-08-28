import { createNote } from './note.service';
import { createFolder } from './folder.service';
import { createTag } from './tag.service';
import { logActivity } from './settings.service';
import type { NoteColor } from '@/types';

/** Seeds a freshly-signed-up user with tasteful starter content. */
export async function seedUserData(userId: string): Promise<void> {
  const [work] = await Promise.all([
    createFolder(userId, { name: 'Work', color: '#6366f1' }),
    createFolder(userId, { name: 'Personal', color: '#10b981' }),
  ]);

  const idea = await createTag(userId, { name: 'idea', color: '#8b5cf6' });
  const todo = await createTag(userId, { name: 'todo', color: '#f59e0b' });

  const notes: {
    title: string;
    content: string;
    color: NoteColor;
    folder_id: string | null;
    is_pinned?: boolean;
    is_favorite?: boolean;
    tags?: string[];
  }[] = [
    {
      title: 'Welcome to NoteFlow ✨',
      content:
        '<h2>Your ideas, beautifully organized.</h2><p>NoteFlow is a <b>premium notes app</b> with rich text editing, folders, tags, and realtime sync — all in one place.</p><blockquote>Start typing and it just works.</blockquote><ul><li>Create notes with the <b>+</b> button</li><li>Pin your favorites</li><li>Attach images and files</li></ul>',
      color: 'indigo',
      folder_id: work.id,
      is_pinned: true,
      is_favorite: true,
      tags: [idea.id],
    },
    {
      title: 'Get started checklist',
      content:
        '<p>Everything you need to try today:</p><ul data-list="checklist"><li data-check="false">Write your first note</li><li data-check="false">Create a folder</li><li data-check="false">Add a tag</li><li data-check="false">Attach an image</li><li data-check="false">Try dark mode 🌙</li></ul>',
      color: 'green',
      folder_id: work.id,
      tags: [todo.id],
      is_pinned: true,
    },
    {
      title: 'Daily standup',
      content:
        '<h3>What did you do yesterday?</h3><ul><li>Shipped the editor</li><li>Fixed the sync bug</li></ul><h3>What are you doing today?</h3><ul><li>Review PRs</li><li>Polish the onboarding</li></ul>',
      color: 'blue',
      folder_id: work.id,
    },
    {
      title: 'Weekend plan 🏖️',
      content:
        '<p>Relax and recharge:</p><ul><li>Morning walk</li><li>Coffee with friends</li><li>Read a book</li></ul>',
      color: 'teal',
      folder_id: null,
      is_favorite: true,
    },
    {
      title: 'Ideas for the app',
      content:
        '<p>A running list of product ideas:</p><ol><li>Offline-first mode</li><li>Handwriting support</li><li>Collaborative editing</li><li>AI-powered summaries</li></ol>',
      color: 'purple',
      folder_id: work.id,
      tags: [idea.id],
    },
  ];

  for (const n of notes) {
    await createNote(userId, {
      title: n.title,
      content: n.content,
      content_text: n.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      color: n.color,
      folder_id: n.folder_id,
      is_pinned: n.is_pinned,
      is_favorite: n.is_favorite,
      tags: n.tags,
    });
  }

  await logActivity(userId, 'onboard', 'Seeded starter content');
}