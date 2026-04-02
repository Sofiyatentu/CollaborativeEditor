import "./App.css";
import { Editor } from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import { SocketIOProvider } from "y-socket.io";

function App() {
  const editorRef = useRef(null);
  const [userName, setUserName] = useState(() => {
    return new URLSearchParams(window.location.search).get("userName") || "";
  });
  const [users, setUsers] = useState([]);
  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setUserName(e.target.userName.value);
    window.history.pushState({}, "", "?userName=" + e.target.userName.value);
  };

  useEffect(() => {
    if (!userName || !editorRef.current) return;

    const provider = new SocketIOProvider(
      "http://localhost:3000",
      "monaco",
      ydoc,
      { autoConnect: true },
    );

    provider.awareness.setLocalStateField("user", { userName });

    provider.awareness.on("change", () => {
      const states = Array.from(provider.awareness.getStates().values());
      setUsers(
        states
          .filter((state) => state.user?.userName)
          .map((state) => state.user),
      );
    });

    function handleBeforeUnload() {
      provider.awareness.setLocalStateField("user", null);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    const binding = new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness,
    );

    return () => {
      provider.destroy();
      binding.destroy();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userName]);

  if (!userName) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name="userName"
          />
          <button
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
            type="submit"
          >
            Join
          </button>
        </form>
      </main>
    );
  }
  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg">
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">
          Users
        </h2>
        <ul className="p-4">
          {users.map((user, index) => (
            <li key={index} className="p-2 bg-gray-800 text-white rounded mb-2">
              {user.userName}
            </li>
          ))}
        </ul>
      </aside>
      <section className="w-3/4 bg-neutral-800 rounded-lg">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme="vs-dark"
          onMount={handleEditorMount}
        />
      </section>
    </main>
  );
}

export default App;
