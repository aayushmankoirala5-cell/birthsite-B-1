"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Copy,
  Heart,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Mail,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { CustomerPublic } from "@/lib/types";

type Draft = Omit<CustomerPublic, "id"> & { birthYear: string };
type Session = {
  authenticated: boolean;
  configured: boolean;
  storageReady?: boolean;
  message?: string;
};
const blankDraft = (): Draft => ({
  slug: "",
  name: "",
  birthday: "",
  birthYear: "",
  theme: "blush",
  headline: "It's Your Day, Beautiful!",
  subtitle: "A little world of love, memories, and wishes. Made just for you.",
  sender: "Someone who loves you",
  letter: "",
  finalMessage: "Here's to all the beautiful things still waiting for you.",
  photos: [{ url: "", caption: "" }],
});
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [customers, setCustomers] = useState<CustomerPublic[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadCustomers() {
    const data = await request<{ customers: CustomerPublic[] }>(
      "/api/admin/customers",
    );
    setCustomers(data.customers);
  }

  useEffect(() => {
    let cancelled = false;
    request<Session>("/api/admin/session")
      .then(async (result) => {
        if (cancelled) return;
        setSession(result);
        if (result.authenticated && result.storageReady !== false) {
          try {
            await loadCustomers();
          } catch (cause) {
            if (!cancelled) setError((cause as Error).message);
          }
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setSession({ authenticated: false, configured: true });
          setError((cause as Error).message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      const result = await request<Session>("/api/admin/session");
      setSession(result);
      if (result.storageReady !== false) await loadCustomers();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/session", { method: "DELETE" });
      setSession((current) =>
        current ? { ...current, authenticated: false } : null,
      );
      setCustomers([]);
      setDraft(null);
      setNotice("");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function edit(customer: CustomerPublic) {
    setDraft({
      ...customer,
      photos: customer.photos.map((photo) => ({ ...photo })),
      birthYear: "",
    });
    setEditingId(customer.id);
    setConfirmDelete(false);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function create() {
    setDraft(blankDraft());
    setEditingId(null);
    setConfirmDelete(false);
    setError("");
    setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    setNotice("");
    const payload: Partial<Draft> = {
      ...draft,
      photos: draft.photos.filter((photo) => photo.url.trim()),
    };
    if (editingId && !payload.birthYear) delete payload.birthYear;
    try {
      const data = await request<{ customer: CustomerPublic }>(
        editingId
          ? `/api/admin/customers/${editingId}`
          : "/api/admin/customers",
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      await loadCustomers();
      setEditingId(data.customer.id);
      setDraft({ ...data.customer, birthYear: "" });
      setNotice("Saved. Your celebration is ready to share.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    setBusy(true);
    setError("");
    try {
      await request(`/api/admin/customers/${editingId}`, { method: "DELETE" });
      await loadCustomers();
      setDraft(null);
      setEditingId(null);
      setConfirmDelete(false);
      setNotice("The celebration has been deleted.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/c/${slug}`,
      );
      setCopied(slug);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setNotice(`Your share link: ${window.location.origin}/c/${slug}`);
    }
  }

  const filtered = customers.filter((customer) =>
    `${customer.name} ${customer.slug}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="admin-shell">
      <header className="studio-header">
        <Link href="/" className="studio-brand">
          <span className="studio-brand-icon">
            <Sparkles size={22} strokeWidth={1.4} />
          </span>
          BirthSite
          <span className="studio-brand-divider" />
          <small>THE STUDIO</small>
        </Link>
        <div className="studio-header-actions">
          <Link href="/" className="studio-text-link">
            View the experience <ArrowUpRight size={15} />
          </Link>
          {session?.authenticated && (
            <button
              className="studio-icon-button"
              aria-label="Sign out"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {!session ? (
        <main className="studio-loading" aria-live="polite">
          <LoaderCircle className="studio-spin" size={25} />
          <p>Opening your studio…</p>
        </main>
      ) : !session.authenticated ? (
        <main className="studio-login-wrap">
          <div className="studio-login-art" aria-hidden="true">
            <span className="studio-orbit orbit-one" />
            <span className="studio-orbit orbit-two" />
            <span className="studio-orbit orbit-three" />
            <span className="studio-art-sparkle">✦</span>
            <div className="studio-art-envelope">
              <Heart size={31} strokeWidth={1} />
            </div>
            <span className="studio-art-caption">
              A little love.
              <br />
              <em>A lot of magic.</em>
            </span>
          </div>
          <div className="studio-login-card">
            <span className="studio-eyebrow">
              <span /> YOUR CREATIVE CORNER
            </span>
            <h1>
              Beautiful things
              <br />
              begin here.
            </h1>
            <p>
              Create something they’ll never forget. Sign in to manage your
              personalized birthday celebrations.
            </p>
            {!session.configured ? (
              <div className="studio-setup-note">
                <ShieldCheck size={24} />
                <div>
                  <h2>Secure setup required</h2>
                  <p>
                    {session.message ||
                      "Set ADMIN_PASSWORD (at least 16 characters) and ADMIN_SESSION_SECRET (at least 32 characters) in your environment, then restart the app."}
                  </p>
                  <p>
                    There is no default administrator password. See the README
                    for setup instructions.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={login} className="studio-login-form">
                <label htmlFor="admin-password">Studio password</label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your private password"
                  required
                  maxLength={512}
                />
                {error && (
                  <p role="alert" className="studio-error">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="studio-button primary"
                  disabled={busy}
                >
                  {busy ? (
                    <LoaderCircle size={17} className="studio-spin" />
                  ) : (
                    <>
                      Enter the studio <ArrowUpRight size={17} />
                    </>
                  )}
                </button>
                <span className="studio-secure">
                  <ShieldCheck size={13} /> A private space, just for you
                </span>
              </form>
            )}
            {!session.configured && error && (
              <p role="alert" className="studio-error">
                {error}
              </p>
            )}
          </div>
        </main>
      ) : (
        <main className="studio-main">
          <section className="studio-page-heading">
            <div>
              <span className="studio-eyebrow">
                <span /> MADE WITH FEELING
              </span>
              <h1>Your little world of celebrations.</h1>
              <p>Every name, every memory, every word. Make it theirs.</p>
            </div>
            <button
              className="studio-button primary"
              onClick={create}
              disabled={busy || session.storageReady === false}
            >
              <Plus size={17} /> New celebration
            </button>
          </section>
          {error && (
            <div className="studio-alert studio-error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="studio-alert studio-success" role="status">
              <span>
                <Check size={16} />
                {notice}
              </span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {session.storageReady === false ? (
            <div className="studio-setup-note">
              <ShieldCheck size={24} />
              <div>
                <h2>Connect your customer database</h2>
                <p>
                  {session.message ||
                    "Set DATABASE_URL to a Neon PostgreSQL connection string to store customer celebrations in production. Restart after updating your environment."}
                </p>
              </div>
            </div>
          ) : (
            <div className={`studio-workspace ${draft ? "is-editing" : ""}`}>
              <aside className="studio-customer-panel">
                <div className="studio-panel-title">
                  <h2>
                    Celebrations <span>{customers.length}</span>
                  </h2>
                  <Sparkles size={18} strokeWidth={1.2} />
                </div>
                {customers.length > 0 && (
                  <label className="studio-search">
                    <Search size={16} />
                    <span className="studio-sr-only">Search celebrations</span>
                    <input
                      type="search"
                      placeholder="Find a celebration…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                )}
                <div className="studio-customer-list">
                  {filtered.map((customer) => (
                    <div
                      key={customer.id}
                      className={`studio-customer-card ${editingId === customer.id ? "selected" : ""}`}
                    >
                      <button
                        onClick={() => edit(customer)}
                        className="studio-customer-select"
                      >
                        <span
                          className={`studio-avatar theme-${customer.theme}`}
                        >
                          {customer.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{customer.name}</strong>
                          <small>
                            <CalendarDays size={12} /> {customer.birthday}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                      <div className="studio-customer-links">
                        <span>/c/{customer.slug}</span>
                        <button
                          onClick={() => copyLink(customer.slug)}
                          aria-label={`Copy ${customer.name}'s celebration link`}
                        >
                          {copied === customer.slug ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <Link
                          href={`/c/${customer.slug}`}
                          aria-label={`Preview ${customer.name}'s celebration`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>
                  ))}
                  {customers.length > 0 && filtered.length === 0 && (
                    <p className="studio-empty-search">
                      No celebrations match your search.
                    </p>
                  )}
                  {customers.length === 0 && (
                    <div className="studio-list-empty">
                      <Heart size={26} strokeWidth={1.2} />
                      <p>
                        The first little spark
                        <br />
                        starts with you.
                      </p>
                      <button className="studio-text-link" onClick={create}>
                        Create a celebration <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="studio-demo-note">
                  <Sparkles size={16} />
                  <p>
                    Need a little inspiration?
                    <br />
                    <Link href="/" target="_blank" rel="noopener noreferrer">
                      Explore Olivia’s demo <ArrowUpRight size={12} />
                    </Link>
                    <small>Birthday password: 2006</small>
                  </p>
                </div>
              </aside>

              {draft ? (
                <section className="studio-editor">
                  <form onSubmit={save}>
                    <div className="studio-editor-heading">
                      <div>
                        <span className="studio-eyebrow">
                          {editingId
                            ? "A LITTLE MORE PERSONAL"
                            : "LET THE MAGIC BEGIN"}
                        </span>
                        <h2>
                          {editingId
                            ? `Made for ${draft.name}`
                            : "A new celebration"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="studio-icon-button"
                        aria-label="Close editor"
                        onClick={() => {
                          setDraft(null);
                          setEditingId(null);
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <fieldset className="studio-form-section">
                      <legend>
                        <span>01</span> The birthday girl
                      </legend>
                      <div className="studio-form-grid">
                        <label>
                          Name
                          <input
                            value={draft.name}
                            onChange={(event) => {
                              const name = event.target.value;
                              setDraft({
                                ...draft,
                                name,
                                slug:
                                  !editingId &&
                                  draft.slug === slugify(draft.name)
                                    ? slugify(name)
                                    : draft.slug,
                              });
                            }}
                            required
                            maxLength={80}
                            placeholder="e.g. Olivia"
                          />
                        </label>
                        <label>
                          Birthday display
                          <input
                            value={draft.birthday}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                birthday: event.target.value,
                              })
                            }
                            required
                            maxLength={80}
                            placeholder="e.g. October 22"
                          />
                        </label>
                        <label>
                          Personal link
                          <input
                            value={draft.slug}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                slug: event.target.value.toLowerCase(),
                              })
                            }
                            required
                            minLength={3}
                            maxLength={60}
                            pattern="[a-z0-9]+(-[a-z0-9]+)*"
                            placeholder="e.g. olivia-birthday"
                          />
                          <small>
                            Letters, numbers, and single hyphens. /c/
                            {draft.slug || "your-name"}
                          </small>
                        </label>
                        <label>
                          Birth year password
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            value={draft.birthYear}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                birthYear: event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4),
                              })
                            }
                            required={!editingId}
                            pattern="[0-9]{4}"
                            maxLength={4}
                            placeholder={
                              editingId
                                ? "Leave blank to keep current"
                                : "e.g. 2006"
                            }
                          />
                          <small>
                            {editingId
                              ? "Only fill this in to change the password."
                              : "A four-digit year, 1900 or later."}
                          </small>
                        </label>
                      </div>
                    </fieldset>
                    <fieldset className="studio-form-section">
                      <legend>
                        <span>02</span> The feeling <Palette size={15} />
                      </legend>
                      <div className="studio-themes">
                        {(
                          [
                            ["blush", "Blush romance", "Pink & rose gold"],
                            [
                              "lavender",
                              "Lavender dream",
                              "Lilac & soft violet",
                            ],
                            ["champagne", "Golden hour", "Cream & champagne"],
                          ] as const
                        ).map(([theme, title, subtitle]) => (
                          <label
                            key={theme}
                            className={`studio-theme-option ${draft.theme === theme ? "active" : ""}`}
                          >
                            <input
                              type="radio"
                              name="theme"
                              value={theme}
                              checked={draft.theme === theme}
                              onChange={() => setDraft({ ...draft, theme })}
                            />
                            <span
                              className={`studio-theme-swatch theme-${theme}`}
                            >
                              {draft.theme === theme && <Check size={14} />}
                            </span>
                            <strong>{title}</strong>
                            <small>{subtitle}</small>
                          </label>
                        ))}
                      </div>
                      <div className="studio-form-grid">
                        <label className="studio-full-width">
                          Reveal headline
                          <input
                            value={draft.headline}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                headline: event.target.value,
                              })
                            }
                            required
                            maxLength={160}
                          />
                        </label>
                        <label className="studio-full-width">
                          Welcome message
                          <textarea
                            value={draft.subtitle}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                subtitle: event.target.value,
                              })
                            }
                            required
                            maxLength={400}
                            rows={2}
                          />
                        </label>
                      </div>
                    </fieldset>
                    <fieldset className="studio-form-section">
                      <legend>
                        <span>03</span> The little moments <Camera size={15} />
                      </legend>
                      <p className="studio-field-description">
                        Add direct HTTPS image links, or local images from
                        /images/. Use photos you have permission to share.
                      </p>
                      <div className="studio-photo-fields">
                        {draft.photos.map((photo, index) => (
                          <div className="studio-photo-row" key={index}>
                            <span className="studio-photo-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <label>
                                Photo URL {index + 1}
                                <input
                                  type="text"
                                  inputMode="url"
                                  value={photo.url}
                                  onChange={(event) =>
                                    setDraft({
                                      ...draft,
                                      photos: draft.photos.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                url: event.target.value,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                  maxLength={2048}
                                  placeholder="https://… or /images/photo.jpg"
                                />
                              </label>
                              <label>
                                Caption {index + 1}
                                <input
                                  value={photo.caption}
                                  onChange={(event) =>
                                    setDraft({
                                      ...draft,
                                      photos: draft.photos.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                caption: event.target.value,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                  maxLength={160}
                                  placeholder="A memory worth keeping"
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              className="studio-icon-button"
                              aria-label={`Remove photo ${index + 1}`}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  photos: draft.photos.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                })
                              }
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="studio-button secondary small"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            photos: [...draft.photos, { url: "", caption: "" }],
                          })
                        }
                        disabled={draft.photos.length >= 12}
                      >
                        <ImagePlus size={15} /> Add a memory
                      </button>
                    </fieldset>
                    <fieldset className="studio-form-section">
                      <legend>
                        <span>04</span> Words from the heart <Mail size={15} />
                      </legend>
                      <div className="studio-form-grid">
                        <label className="studio-full-width">
                          Birthday letter
                          <textarea
                            value={draft.letter}
                            onChange={(event) =>
                              setDraft({ ...draft, letter: event.target.value })
                            }
                            required
                            maxLength={10000}
                            rows={7}
                            placeholder="Dear Olivia,\n\nSome people make the world a little brighter just by being in it…"
                          />
                          <small>
                            Line breaks are preserved. Your message stays
                            private until unlocked.
                          </small>
                        </label>
                        <label className="studio-full-width">
                          With love, from
                          <input
                            value={draft.sender}
                            onChange={(event) =>
                              setDraft({ ...draft, sender: event.target.value })
                            }
                            required
                            maxLength={100}
                            placeholder="e.g. Your favorite person"
                          />
                        </label>
                        <label className="studio-full-width">
                          The final wish
                          <textarea
                            value={draft.finalMessage}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                finalMessage: event.target.value,
                              })
                            }
                            required
                            maxLength={3000}
                            rows={3}
                          />
                        </label>
                      </div>
                    </fieldset>
                    <div className="studio-editor-footer">
                      <div>
                        {editingId && (
                          <button
                            type="button"
                            className="studio-delete-button"
                            onClick={() => setConfirmDelete(!confirmDelete)}
                            disabled={busy}
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        )}
                      </div>
                      <div>
                        {editingId && (
                          <Link
                            className="studio-button secondary"
                            href={`/c/${draft.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Preview <ArrowUpRight size={15} />
                          </Link>
                        )}
                        <button
                          type="submit"
                          className="studio-button primary"
                          disabled={busy}
                        >
                          {busy ? (
                            <LoaderCircle size={16} className="studio-spin" />
                          ) : (
                            <>
                              <Check size={16} /> Save celebration
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {confirmDelete && (
                      <div className="studio-delete-confirm" role="alert">
                        <p>
                          Delete {draft.name}’s celebration? This permanently
                          removes the messages, photos, and share link.
                        </p>
                        <div>
                          <button
                            type="button"
                            className="studio-button secondary small"
                            onClick={() => setConfirmDelete(false)}
                            disabled={busy}
                          >
                            Keep celebration
                          </button>
                          <button
                            type="button"
                            className="studio-button danger small"
                            onClick={remove}
                            disabled={busy}
                          >
                            {busy ? "Deleting…" : "Yes, delete permanently"}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </section>
              ) : (
                <section className="studio-welcome">
                  <div className="studio-welcome-visual" aria-hidden="true">
                    <span>✧</span>
                    <div>
                      <Heart size={35} strokeWidth={1} />
                    </div>
                    <span>✦</span>
                  </div>
                  <span className="studio-eyebrow">
                    MORE THAN A BIRTHDAY WEBSITE
                  </span>
                  <h2>
                    A feeling they can
                    <br />
                    <em>come back to.</em>
                  </h2>
                  <p>
                    A familiar face. A favorite memory. The words you’ve always
                    wanted to say. Turn the little things into something
                    unforgettable.
                  </p>
                  <button className="studio-button primary" onClick={create}>
                    <Plus size={16} /> Create a celebration
                  </button>
                  <span className="studio-welcome-footer">
                    PERSONAL. THOUGHTFUL. ENTIRELY THEIRS.
                  </span>
                </section>
              )}
            </div>
          )}
        </main>
      )}
      <footer className="studio-footer">
        <span>BirthSite Studio</span>
        <span>Little details. Lasting memories.</span>
        <Link href="/">
          <ArrowLeft size={12} /> Back to the magic
        </Link>
      </footer>
    </div>
  );
}
