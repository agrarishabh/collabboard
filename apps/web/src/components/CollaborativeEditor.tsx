"use client";
import React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";

function EditorSurface() {
  const liveblocks = useLiveblocksExtension();

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // @ts-expect-error - Tiptap v3 typing sometimes doesn't expose history here, but it works
        history: false, // The Liveblocks extension comes with its own history handling
      }),
      liveblocks,
    ],
    onTransaction: () => {
      // Force React to re-render so the toolbar buttons update immediately
      forceUpdate();
    },
  });

  if (!editor) {
    return <div className="p-8 text-gray-400">Initializing editor...</div>;
  }

  return (
    <div className="bg-bg-surface text-text-primary rounded-lg shadow-sm border border-border-default overflow-hidden" style={{ minHeight: 500 }}>
      <div className="bg-bg-primary border-b border-border-subtle p-2 flex gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${editor.isActive("bold") ? "bg-accent text-accent-foreground shadow-sm" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"}`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${editor.isActive("italic") ? "bg-accent text-accent-foreground shadow-sm" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"}`}
        >
          Italic
        </button>
      </div>

      <div className="p-8 prose max-w-none focus:outline-none" style={{ minHeight: 400 }}>
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}

export default function CollaborativeEditor({ documentId }: { documentId: string }) {
  // We now require the secret key in the backend for proper authentication
  // but we can still check if they have at least the public key or warn them
  const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

  if (!publicApiKey) {
    return (
      <div className="p-8 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
        <h2 className="font-bold text-lg mb-2">Liveblocks Key Missing</h2>
        <p>Please make sure you have added both your public and secret keys to your <code>apps/web/.env</code> file:</p>
        <pre className="bg-bg-secondary p-4 rounded mt-4 text-sm font-mono border border-border-subtle">
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_prod_...
LIVEBLOCKS_SECRET_KEY=sk_prod_...
        </pre>
        <p className="mt-4 text-sm font-bold">You must restart the Next.js dev server after adding the keys.</p>
      </div>
    );
  }

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={documentId} initialPresence={{ cursor: null }}>
        <ClientSideSuspense fallback={<div className="p-8 text-text-tertiary flex items-center justify-center">Connecting to real-time editor...</div>}>
          <EditorSurface />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
