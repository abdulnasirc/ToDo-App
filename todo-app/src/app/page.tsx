"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type Filter = "all" | "active" | "completed";

const sampleTodos: Todo[] = [
  { id: 1, text: "Plan the week", completed: false },
  { id: 2, text: "Review project notes", completed: true },
  { id: 3, text: "Send follow-up email", completed: false },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>(sampleTodos);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [dbTableMissing, setDbTableMissing] = useState(false);

  const loadTodos = async () => {
    const { data, error } = await supabase.from("todos").select("*").order("id", {
      ascending: false,
    });

    if (error) {
      const isTableMissing =
        error.code === "PGRST205" ||
        error.message.toLowerCase().includes("could not find the table") ||
        error.message.toLowerCase().includes("public.todos");

      if (isTableMissing) {
        setDbTableMissing(true);
      }

      const savedTodos = window.localStorage.getItem("todo-app-items");
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }
      return;
    }

    setDbTableMissing(false);

    if (data) {
      setTodos(
        data.map((todo) => ({
          id: Number(todo.id),
          text: todo.text,
          completed: Boolean(todo.completed),
        })),
      );
    }
  };

  useEffect(() => {
    const savedTodos = window.localStorage.getItem("todo-app-items");
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      loadTodos();
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("todo-app-items", JSON.stringify(todos));
  }, [todos]);

  const visibleTodos = useMemo(() => {
    switch (filter) {
      case "active":
        return todos.filter((todo) => !todo.completed);
      case "completed":
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }, [filter, todos]);

  const remainingCount = todos.filter((todo) => !todo.completed).length;

  const addTodo = async () => {
    const trimmedText = newTodo.trim();
    if (!trimmedText) return;

    const newItem = {
      id: Date.now(),
      text: trimmedText,
      completed: false,
    };

    setTodos((currentTodos) => [newItem, ...currentTodos]);
    setNewTodo("");

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase.from("todos").insert([{ text: trimmedText, completed: false }]);
      if (error) {
        const isTableMissing =
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("could not find the table") ||
          error.message.toLowerCase().includes("public.todos");

        if (isTableMissing) {
          setDbTableMissing(true);
          return;
        }

        console.error("Insert error:", error.message);
      }
    }
  };

  const toggleTodo = async (id: number) => {
    const selectedTodo = todos.find((todo) => todo.id === id);
    if (!selectedTodo) return;

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase
        .from("todos")
        .update({ completed: !selectedTodo.completed })
        .eq("id", id);

      if (error) {
        const isTableMissing =
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("could not find the table") ||
          error.message.toLowerCase().includes("public.todos");

        if (isTableMissing) {
          setDbTableMissing(true);
          return;
        }

        console.error("Update error:", error.message);
      }
    }
  };

  const deleteTodo = async (id: number) => {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditText("");
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) {
        const isTableMissing =
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("could not find the table") ||
          error.message.toLowerCase().includes("public.todos");

        if (isTableMissing) {
          setDbTableMissing(true);
          return;
        }

        console.error("Delete error:", error.message);
      }
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = async () => {
    const trimmedText = editText.trim();
    if (!trimmedText || editingId === null) return;

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === editingId ? { ...todo, text: trimmedText } : todo,
      ),
    );

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase
        .from("todos")
        .update({ text: trimmedText })
        .eq("id", editingId);

      if (error) {
        const isTableMissing =
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("could not find the table") ||
          error.message.toLowerCase().includes("public.todos");

        if (isTableMissing) {
          setDbTableMissing(true);
          return;
        }

        console.error("Edit error:", error.message);
      }
    }

    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const clearCompleted = async () => {
    setTodos((currentTodos) => currentTodos.filter((todo) => !todo.completed));

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase.from("todos").delete().eq("completed", true);
      if (error) {
        const isTableMissing =
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("could not find the table") ||
          error.message.toLowerCase().includes("public.todos");

        if (isTableMissing) {
          setDbTableMissing(true);
          return;
        }

        console.error("Clear completed error:", error.message);
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b,_#020617_60%)] px-4 py-10 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              Productivity
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              My To-Do List
            </h1>
          </div>
          <div className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
            {remainingCount} left
          </div>
        </div>

        {dbTableMissing && (
          <div className="mb-5 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Supabase table not found. Create the public.todos table in your Supabase SQL editor and refresh the page.
          </div>
        )}

        <div className="mb-5 flex gap-3">
          <input
            aria-label="Add a new task"
            value={newTodo}
            onChange={(event) => setNewTodo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTodo();
              }
            }}
            placeholder="Add a new task..."
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
          />
          <button
            type="button"
            onClick={addTodo}
            className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Add
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(["all", "active", "completed"] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition ${
                filter === option
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {visibleTodos.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-8 text-center text-slate-400">
              No tasks in this view yet.
            </li>
          ) : (
            visibleTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-3"
              >
                {editingId === todo.id ? (
                  <>
                    <input
                      aria-label="Edit task text"
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveEdit();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelEdit();
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-full bg-emerald-400 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-full bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                      onClick={() => toggleTodo(todo.id)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm font-bold transition ${
                        todo.completed
                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                          : "border-slate-500 bg-transparent text-transparent hover:border-cyan-400"
                      }`}
                    >
                      ✓
                    </button>

                    <span
                      className={`flex-1 text-base ${
                        todo.completed ? "text-slate-500 line-through" : "text-slate-100"
                      }`}
                    >
                      {todo.text}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(todo)}
                        className="rounded-full px-2 py-1 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-cyan-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTodo(todo.id)}
                        className="rounded-full px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-slate-700 pt-4 text-sm text-slate-300">
          <span>{todos.length} total items</span>
          <button
            type="button"
            onClick={clearCompleted}
            disabled={todos.every((todo) => !todo.completed)}
            className="rounded-full px-3 py-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear completed
          </button>
        </div>
      </section>
    </main>
  );
}
