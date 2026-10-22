"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  LockKeyhole,
  Mail,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CustomerPublic, CustomerTeaser } from "@/lib/types";
import { assetPath } from "@/lib/asset-path";

type Stage =
  "welcome" | "countdown" | "reveal" | "cloud" | "unlock" | "celebration";
const easing = [0.22, 1, 0.36, 1] as const;

function Flower({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <ellipse cx="20" cy="12" rx="5" ry="10" />
        <ellipse cx="20" cy="28" rx="5" ry="10" />
        <ellipse cx="12" cy="20" rx="10" ry="5" />
        <ellipse cx="28" cy="20" rx="10" ry="5" />
      </g>
      <circle cx="20" cy="20" r="4" fill="#eed8b8" />
    </svg>
  );
}
function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 0C20 15 25 20 40 20C25 20 20 25 20 40C20 25 15 20 0 20C15 20 20 15 20 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
function Confetti({ burst = false }: { burst?: boolean }) {
  return (
    <div
      className={`confetti-field ${burst ? "confetti-burst" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: burst ? 60 : 20 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37 + 7) % 100}%`,
            animationDelay: `${(i % 11) * -0.7}s`,
            animationDuration: `${6 + (i % 5)}s`,
            background: ["#d8b875", "#d9a6b0", "#baa6cf", "#e7cfaa"][i % 4],
            width: i % 3 === 0 ? 5 : 3,
            height: i % 3 === 0 ? 10 : 4,
            borderRadius: i % 2 ? "50%" : 0,
          }}
        />
      ))}
    </div>
  );
}

function useBirthdayMusic() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    setPlaying(false);
  }, []);
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void audioRef.current?.close();
    },
    [],
  );
  const toggle = () => {
    if (playing) {
      stop();
      return;
    }
    const ctx = new AudioContext();
    audioRef.current = ctx;
    const notes = [
      261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 261.63, 349.23,
      440, 523.25, 493.88, 392, 329.63, 293.66,
    ];
    let index = 0;
    const chime = () => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = notes[index++ % notes.length];
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 2.1);
    };
    chime();
    timerRef.current = setInterval(chime, 620);
    setPlaying(true);
  };
  return { playing, toggle };
}

export default function BirthdayExperience({
  teaser,
  demoContent,
}: {
  teaser: CustomerTeaser;
  /** Only the public sample is included in the static GitHub Pages build. */
  demoContent?: CustomerPublic;
}) {
  const [stage, setStage] = useState<Stage>("welcome");
  const [count, setCount] = useState(3);
  const [celebration, setCelebration] = useState<CustomerPublic | null>(null);
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [wishMade, setWishMade] = useState(false);
  const [wish, setWish] = useState("");
  const [showWishInput, setShowWishInput] = useState(false);
  const [wishSaved, setWishSaved] = useState(false);
  const reduced = useReducedMotion();
  const music = useBirthdayMusic();
  const pendingStage = useRef<Stage>("unlock");
  const focusRef = useRef<HTMLInputElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeLightboxRef = useRef<HTMLButtonElement>(null);
  const lastPhotoRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (stage !== "countdown") return;
    const timer = setTimeout(() => {
      if (count > 1) setCount(count - 1);
      else setStage("reveal");
    }, 1050);
    return () => clearTimeout(timer);
  }, [stage, count]);
  useEffect(() => {
    if (stage !== "cloud") return;
    const timer = setTimeout(
      () => {
        setStage(pendingStage.current);
        window.scrollTo({ top: 0, behavior: "instant" });
      },
      reduced ? 50 : 1500,
    );
    return () => clearTimeout(timer);
  }, [stage, reduced]);
  useEffect(() => {
    if (stage === "unlock") focusRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    if (lightbox === null) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeLightboxRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "Tab") {
        const buttons =
          lightboxRef.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === "ArrowRight" && celebration)
        setLightbox((value) => ((value ?? 0) + 1) % celebration.photos.length);
      if (event.key === "ArrowLeft" && celebration)
        setLightbox(
          (value) =>
            ((value ?? 0) - 1 + celebration.photos.length) %
            celebration.photos.length,
        );
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
      lastPhotoRef.current?.focus();
    };
  }, [lightbox, celebration]);

  const begin = () => {
    setCount(3);
    setStage(reduced ? "unlock" : "countdown");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const cloudTo = (next: Stage) => {
    pendingStage.current = next;
    setStage("cloud");
  };
  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      let unlocked: CustomerPublic;
      if (demoContent && teaser.slug === "demo" && demoContent.id === "demo") {
        // This is a public demo surprise, not authentication for customer data.
        if (year !== "2006")
          throw new Error("Not quite. Try the year you were born.");
        unlocked = demoContent;
      } else {
        const response = await fetch(
          `/api/celebration/${encodeURIComponent(teaser.slug)}/unlock`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ birthYear: year }),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Something went wrong. Please try again.",
          );
        unlocked = data.celebration;
      }
      setCelebration(unlocked);
      try {
        const saved = localStorage.getItem(`birthsite-note-${teaser.slug}`);
        if (saved) {
          setWish(saved);
          setWishSaved(true);
        }
      } catch {
        /* Notes are optional when browser storage is unavailable. */
      }
      cloudTo("celebration");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const jump = (anchor: string) => {
    if (stage === "celebration")
      document
        .getElementById(anchor)
        ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
    else begin();
  };
  const photos = celebration?.photos ?? [];

  return (
    <MotionConfig reducedMotion="user">
      <div className={`birthsite theme-${celebration?.theme ?? teaser.theme}`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="BirthSite home">
            <Flower />
            <span>
              birthsite<span className="brand-dot">.</span>
            </span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <button onClick={() => jump("celebration")}>The surprise</button>
            <button onClick={() => jump("memories")}>Our memories</button>
            <button onClick={() => jump("letter")}>A little love</button>
          </nav>
          <button
            className={`sound-toggle ${music.playing ? "sound-on" : ""}`}
            onClick={music.toggle}
            aria-pressed={music.playing}
          >
            {music.playing ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>Sound {music.playing ? "on" : "off"}</span>
            <span className="sound-indicator" />
          </button>
        </header>

        <main id="main-content">
          {stage === "welcome" && (
            <>
              <section className="welcome-hero page-width">
                <div className="hero-copy">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="eyebrow"
                  >
                    <span className="tiny-star">✦</span> SOMEONE VERY SPECIAL
                    WAS BORN TODAY
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.08, ease: easing }}
                  >
                    {teaser.slug === "demo" ? (
                      <>
                        Some days are
                        <br />
                        made for
                        <br />
                        <em>a little magic.</em>
                      </>
                    ) : (
                      <>{teaser.headline}</>
                    )}
                  </motion.h1>
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.22 }}
                  >
                    <p className="hero-description">
                      {teaser.slug === "demo" ? (
                        <>
                          A little world of love, memories, and wishes.
                          <br />
                          Made with a whole lot of heart, just for{" "}
                          <strong>{teaser.name}.</strong>
                        </>
                      ) : (
                        <>
                          {teaser.subtitle}
                          <br />
                          Made just for <strong>{teaser.name}.</strong>
                        </>
                      )}
                    </p>
                    <button className="primary-button" onClick={begin}>
                      Open your surprise <ArrowRight size={17} />
                    </button>
                    <div className="hero-footnote">
                      <LockKeyhole size={12} />
                      <span>Your very own little corner of the universe</span>
                    </div>
                  </motion.div>
                  <div className="handwritten hero-annotation">
                    a moment, just for you{" "}
                    <svg
                      width="60"
                      height="29"
                      viewBox="0 0 60 29"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 22C20 30 37 21 43 3M36 8L44 2L49 12"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <motion.div
                  className="hero-art"
                  initial={{ opacity: 0, y: 30, rotate: 2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 1.15, delay: 0.12, ease: easing }}
                >
                  <div className="art-halo" />
                  <div className="art-circle" />
                  <Star className="hero-sparkle sparkle-one" />
                  <Star className="hero-sparkle sparkle-two" />
                  <Star className="hero-sparkle sparkle-three" />
                  <div className="birthday-stamp">
                    <span>HAPPY</span>
                    <Flower />
                    <span>BIRTHDAY</span>
                  </div>
                  <div className="photo-frame hero-photo">
                    <div className="tape tape-top" />
                    <Image
                      src={assetPath("/images/birthday-editorial.png")}
                      alt="A blush birthday cake with candles, flowers, and champagne balloons"
                      width={600}
                      height={650}
                      sizes="(max-width: 540px) 270px, 405px"
                      priority
                    />
                    <div className="photo-frame-caption">
                      <span className="handwritten">
                        a wish, a little wonder
                      </span>
                      <Heart size={15} />
                    </div>
                  </div>
                  <div className="floating-note">
                    <Heart size={18} strokeWidth={1.3} />
                    <span>
                      The best part of today?
                      <br />
                      <strong>You.</strong>
                    </span>
                  </div>
                  <div className="date-tag">
                    <span>A BEAUTIFUL DAY TO BE YOU</span>
                    <span className="date-value">{teaser.birthday}</span>
                    <span className="date-flower">✿</span>
                  </div>
                </motion.div>
              </section>
              <div className="love-divider page-width">
                <span />
                <Flower />
                <p>A little surprise. A thousand feelings.</p>
                <Flower />
                <span />
              </div>
              <section
                className="inside-section page-width"
                aria-labelledby="inside-heading"
              >
                <div className="inside-heading">
                  <div>
                    <span className="eyebrow">
                      BECAUSE YOU DESERVE SOMETHING SPECIAL
                    </span>
                    <h2 id="inside-heading">
                      A few things, <em>from the heart.</em>
                    </h2>
                  </div>
                  <p>
                    Not just a birthday wish.
                    <br />A little experience to keep forever.
                  </p>
                </div>
                <div className="preview-grid">
                  <button
                    className="preview-card card-memories"
                    onClick={begin}
                  >
                    <span className="preview-number">01 / THE MEMORIES</span>
                    <div className="mini-polaroids">
                      <div className="mini-photo mini-one">
                        <Image
                          src={assetPath("/images/memory-1.jpg")}
                          alt=""
                          width={110}
                          height={120}
                          sizes="110px"
                        />
                      </div>
                      <div className="mini-photo mini-two">
                        <Image
                          src={assetPath("/images/memory-2.jpg")}
                          alt=""
                          width={110}
                          height={120}
                          sizes="110px"
                        />
                      </div>
                      <span className="mini-star">✧</span>
                    </div>
                    <div className="preview-card-bottom">
                      <div>
                        <h3>Little moments. Big feelings.</h3>
                        <p>A collection of beautiful little memories.</p>
                      </div>
                      <span className="round-arrow">
                        <ArrowRight size={17} />
                      </span>
                    </div>
                  </button>
                  <button className="preview-card card-letter" onClick={begin}>
                    <span className="preview-number">02 / THE WORDS</span>
                    <div className="mini-envelope">
                      <div className="envelope-paper">
                        <span>Dear {teaser.name},</span>
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="envelope-body" />
                      <div className="wax-seal">
                        <Heart size={16} fill="currentColor" />
                      </div>
                    </div>
                    <div className="preview-card-bottom">
                      <div>
                        <h3>Some words, just for you.</h3>
                        <p>The things that a simple wish can’t say.</p>
                      </div>
                      <span className="round-arrow">
                        <ArrowRight size={17} />
                      </span>
                    </div>
                  </button>
                  <button className="preview-card card-wish" onClick={begin}>
                    <span className="preview-number">03 / THE WISH</span>
                    <div className="mini-cake">
                      <span className="mini-flame" />
                      <span className="mini-candle" />
                      <div className="mini-cake-top" />
                      <div className="mini-cake-base" />
                      <div className="mini-cake-plate" />
                      <Star className="mini-cake-star" />
                    </div>
                    <div className="preview-card-bottom">
                      <div>
                        <h3>Make a little wish.</h3>
                        <p>Close your eyes. Let a little magic in.</p>
                      </div>
                      <span className="round-arrow">
                        <ArrowRight size={17} />
                      </span>
                    </div>
                  </button>
                </div>
              </section>
              <div className="welcome-bottom">
                <Heart size={13} />
                <span>
                  Some people make the world a little softer. You’re one of
                  them.
                </span>
              </div>
            </>
          )}

          {stage === "unlock" && (
            <motion.section
              className="unlock-section page-width"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                className="text-button back-button"
                onClick={() => {
                  setStage("welcome");
                  setError("");
                }}
              >
                <ArrowLeft size={15} /> Back to your invitation
              </button>
              <div className="unlock-card">
                <div className="unlock-flower">
                  <Flower />
                </div>
                <span className="eyebrow">A LITTLE SECRET BETWEEN US</span>
                <h1>
                  Every beautiful story
                  <br />
                  has a <em>beginning.</em>
                </h1>
                <p>
                  Tell us the year yours began,
                  <br />
                  and let your birthday magic unfold.
                </p>
                <form onSubmit={unlock}>
                  <label htmlFor="birth-year">Your birth year</label>
                  <input
                    ref={focusRef}
                    id="birth-year"
                    className="year-input"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="• • • •"
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value.replace(/\D/g, "").slice(0, 4));
                      setError("");
                    }}
                    pattern="[0-9]{4}"
                    maxLength={4}
                    minLength={4}
                    required
                    aria-describedby={error ? "unlock-error" : "year-hint"}
                    aria-invalid={!!error}
                  />
                  <button
                    className="primary-button"
                    disabled={loading || year.length !== 4}
                  >
                    {loading
                      ? "Opening your little world…"
                      : "Let the magic in"}
                    <Sparkles size={16} />
                  </button>
                  {error && (
                    <p className="form-error" id="unlock-error" role="alert">
                      {error}
                    </p>
                  )}
                  <p id="year-hint" className="year-hint">
                    {teaser.slug === "demo"
                      ? "Psst… the demo birthday year is 2006."
                      : "A little hint: the year you were born."}
                  </p>
                </form>
                <Heart size={18} className="unlock-heart" />
                <span className="unlock-dedication">
                  Made with love, for {teaser.name}
                </span>
              </div>
              <Star className="unlock-star" />
            </motion.section>
          )}

          {stage === "celebration" && celebration && (
            <>
              <section className="celebration-hero" id="celebration">
                <Confetti />
                <div className="balloon balloon-one" />
                <div className="balloon balloon-two" />
                <div className="balloon balloon-three" />
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1 }}
                  className="celebration-hero-content"
                >
                  <div className="eyebrow">
                    <Sparkles size={14} /> THE WORLD IS LUCKIER WITH YOU IN IT
                  </div>
                  <h1>
                    It’s your day,
                    <br />
                    <em>{celebration.name}.</em>
                  </h1>
                  <p>{celebration.subtitle}</p>
                  <span className="birthday-chip">
                    <Flower /> {celebration.birthday} · All about you <Flower />
                  </span>
                  <button
                    className="scroll-cue"
                    onClick={() => jump("memories")}
                    aria-label="Explore your birthday memories"
                  >
                    <ArrowDown size={20} />
                  </button>
                </motion.div>
              </section>
              <section className="memory-section page-width" id="memories">
                <div className="section-heading">
                  <span className="eyebrow">01 / OUR LITTLE TIME CAPSULE</span>
                  <h2>
                    Life looks beautiful <em>on you.</em>
                  </h2>
                  <p>
                    Ordinary moments. Extraordinary you. A few memories worth
                    holding on to.
                  </p>
                </div>
                <div className="memory-grid">
                  {photos.map((photo, index) => (
                    <motion.button
                      key={`${photo.url}-${index}`}
                      className="memory-polaroid"
                      initial={{ opacity: 0, y: 35 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{
                        duration: 0.7,
                        delay: Math.min(index * 0.1, 0.3),
                      }}
                      onClick={(event) => {
                        lastPhotoRef.current = event.currentTarget;
                        setLightbox(index);
                      }}
                      aria-label={`View photo ${index + 1}: ${photo.caption}`}
                    >
                      <div className="memory-image">
                        <Image
                          src={assetPath(photo.url)}
                          alt={photo.caption || `Birthday memory ${index + 1}`}
                          width={600}
                          height={700}
                          unoptimized
                          loading="lazy"
                        />
                        <span className="photo-expand">
                          <ImageIcon size={17} />
                        </span>
                      </div>
                      <span className="handwritten">{photo.caption}</span>
                      <span className="photo-index">
                        {String(index + 1).padStart(2, "0")} ♡
                      </span>
                    </motion.button>
                  ))}
                </div>
                <p className="small-caption">
                  Click a memory. Stay a little longer.
                </p>
              </section>
              <section className="letter-section" id="letter">
                <div className="letter-inner page-width">
                  <div className="letter-copy">
                    <span className="eyebrow">
                      02 / A FEW THINGS YOU SHOULD KNOW
                    </span>
                    <h2>
                      If love were a letter,
                      <br />
                      <em>this would be yours.</em>
                    </h2>
                    <p>
                      Some feelings deserve more than a birthday text.
                      <br />
                      So here’s a little piece of the heart, folded just for
                      you.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setLetterOpen(!letterOpen)}
                    >
                      {letterOpen ? "Fold your letter" : "Open your letter"}{" "}
                      {letterOpen ? (
                        <Mail size={17} />
                      ) : (
                        <ArrowRight size={17} />
                      )}
                    </button>
                  </div>
                  <div
                    className={`big-envelope ${letterOpen ? "is-open" : ""}`}
                  >
                    <button
                      className="envelope-trigger"
                      aria-label={
                        letterOpen
                          ? "Fold your birthday letter"
                          : "Open your birthday letter"
                      }
                      aria-expanded={letterOpen}
                      onClick={() => setLetterOpen(!letterOpen)}
                    >
                      <div className="big-envelope-back" />
                      <div className="big-envelope-flap" />
                      <div className="big-envelope-front" />
                      <div className="big-seal">
                        <Heart size={22} fill="currentColor" />
                      </div>
                      <span className="handwritten">
                        for {celebration.name}, with love
                      </span>
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {letterOpen && (
                    <motion.article
                      className="birthday-letter"
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <span className="eyebrow">A LETTER TO KEEP</span>
                      <h3 className="handwritten">
                        My dearest {celebration.name},
                      </h3>
                      <div className="letter-body">
                        {celebration.letter
                          .split("\n")
                          .filter(Boolean)
                          .map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                      </div>
                      <div className="letter-signature">
                        With all my love,
                        <br />
                        <span className="handwritten">
                          {celebration.sender}
                        </span>
                        <Heart size={17} />
                      </div>
                    </motion.article>
                  )}
                </AnimatePresence>
              </section>
              <section className="wish-section page-width" id="wish">
                <div className="section-heading">
                  <span className="eyebrow">03 / A LITTLE BIRTHDAY MAGIC</span>
                  <h2>
                    Close your eyes.
                    <br />
                    <em>Make it a good one.</em>
                  </h2>
                  <p>
                    {wishMade
                      ? "A little wish, sent out into the universe. May it find its way to you."
                      : "The candles are glowing. The moment is yours. What will you wish for?"}
                  </p>
                </div>
                <div
                  className={`birthday-cake ${wishMade ? "candles-out" : ""}`}
                  aria-label={
                    wishMade
                      ? "Birthday cake with candles blown out"
                      : "Birthday cake with five glowing candles"
                  }
                >
                  <div className="cake-glow" />
                  <div className="candles">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        className="candle"
                        key={i}
                        style={{ height: `${48 + (i % 2) * 12}px` }}
                      >
                        <span className="flame" />
                        <span className="wick" />
                        {wishMade && <span className="candle-smoke" />}
                      </div>
                    ))}
                  </div>
                  <div className="cake-top">
                    <div className="cake-cherry" />
                  </div>
                  <div className="cake-frosting">
                    {Array.from({ length: 12 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                  <div className="cake-body">
                    <span className="cake-label handwritten">make a wish</span>
                    <div className="cake-dots" />
                  </div>
                  <div className="cake-bottom" />
                  <div className="cake-stand" />
                  <div className="cake-foot" />
                  {wishMade && <Confetti burst />}
                </div>
                <button
                  className="primary-button"
                  disabled={wishMade}
                  onClick={() => setWishMade(true)}
                >
                  {wishMade ? (
                    <>
                      <Check size={17} /> Your wish is on its way
                    </>
                  ) : (
                    <>
                      Blow out the candles <Sparkles size={16} />
                    </>
                  )}
                </button>
                {wishMade && (
                  <button
                    className="text-button relight-button"
                    onClick={() => setWishMade(false)}
                  >
                    <RotateCcw size={13} /> A little more magic? Relight
                  </button>
                )}
              </section>
              <section className="final-section">
                <Star className="final-star" />
                <span className="eyebrow">AND BEFORE YOU GO…</span>
                <h2>
                  Never forget how
                  <br />
                  <em>loved you are.</em>
                </h2>
                <p>{celebration.finalMessage}</p>
                <div className="handwritten final-signoff">
                  Happy birthday, {celebration.name}. ♡
                </div>
                <button
                  className="outline-button"
                  onClick={() => setShowWishInput(!showWishInput)}
                >
                  {wishSaved ? <Check size={15} /> : <Heart size={15} />}{" "}
                  {wishSaved
                    ? "Your note is saved on this device"
                    : "Leave a little note for your future self"}
                </button>
                {showWishInput && (
                  <form
                    className="future-note"
                    onSubmit={(event) => {
                      event.preventDefault();
                      try {
                        localStorage.setItem(
                          `birthsite-note-${teaser.slug}`,
                          wish,
                        );
                        setWishSaved(true);
                        setShowWishInput(false);
                      } catch {
                        setError(
                          "Your browser could not save this note. You can copy it to keep it.",
                        );
                      }
                    }}
                  >
                    <label htmlFor="future-note">
                      A little reminder for your next chapter
                    </label>
                    <textarea
                      id="future-note"
                      placeholder="Dear future me…"
                      value={wish}
                      onChange={(event) => setWish(event.target.value)}
                      maxLength={2000}
                      required
                    />
                    <span>Saved only in this browser, on this device.</span>
                    <button className="primary-button" type="submit">
                      Keep this little note <Heart size={15} />
                    </button>
                    {error && <p role="alert">{error}</p>}
                  </form>
                )}
                <button className="text-button replay-button" onClick={begin}>
                  <RotateCcw size={13} /> Experience the magic again
                </button>
              </section>
            </>
          )}
        </main>

        <footer className="site-footer page-width">
          <Link className="brand footer-brand" href="/">
            <Flower />
            <span>
              birthsite<span className="brand-dot">.</span>
            </span>
          </Link>
          <p>Little celebrations. Lasting feelings.</p>
          <span>
            MADE WITH LOVE <Heart size={11} />
          </span>
        </footer>

        <AnimatePresence>
          {(stage === "countdown" || stage === "reveal") && (
            <motion.div
              className="cinema-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              role="region"
              aria-label="Birthday surprise opening"
            >
              <div className="cinema-stars">
                <Confetti />
              </div>
              <motion.div
                className="velvet-curtain curtain-left"
                initial={{ x: 0 }}
                animate={{ x: stage === "reveal" ? "-103%" : 0 }}
                transition={{ duration: 2.3, ease: [0.65, 0, 0.25, 1] }}
              />
              <motion.div
                className="velvet-curtain curtain-right"
                initial={{ x: 0 }}
                animate={{ x: stage === "reveal" ? "103%" : 0 }}
                transition={{ duration: 2.3, ease: [0.65, 0, 0.25, 1] }}
              />
              <div className="curtain-valance" />
              <button
                className="cinema-skip"
                onClick={() => setStage("unlock")}
              >
                Skip intro <ArrowRight size={14} />
              </button>
              {stage === "countdown" && (
                <div
                  className="countdown-content"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="eyebrow">THE WORLD CAN WAIT A MOMENT</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      className="countdown-number"
                      key={count}
                      initial={{ opacity: 0, scale: 0.8, filter: "blur(7px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      transition={{ duration: 0.45 }}
                    >
                      {count}
                    </motion.span>
                  </AnimatePresence>
                  <p>Something beautiful is about to begin.</p>
                </div>
              )}
              {stage === "reveal" && (
                <motion.div
                  className="cinematic-reveal"
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 1.5 }}
                >
                  <Sparkles size={28} />
                  <span className="eyebrow">
                    THE SPOTLIGHT HAS ALWAYS BEEN YOURS
                  </span>
                  <h1>
                    {teaser.slug === "demo" ? (
                      <>
                        It’s Your Day,
                        <br />
                        <em>Beautiful!</em>
                      </>
                    ) : (
                      <em>{teaser.headline}</em>
                    )}
                  </h1>
                  <p>And this little world was made just for you.</p>
                  <button
                    className="primary-button"
                    onClick={() => cloudTo("unlock")}
                  >
                    Come a little closer <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
          {stage === "cloud" && (
            <motion.div
              className="cloud-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65 }}
              aria-label="A little magic is unfolding"
              role="status"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <motion.div
                  className="cloud-puff"
                  key={i}
                  style={{
                    top: `${(i % 4) * 28 - 10}%`,
                    left: `${i % 2 ? 48 : -28}%`,
                  }}
                  initial={{ x: i % 2 ? "70vw" : "-70vw", scale: 0.8 }}
                  animate={{ x: 0, scale: 1.3 }}
                  transition={{
                    duration: 1.2,
                    delay: (i % 3) * 0.1,
                    ease: easing,
                  }}
                />
              ))}
              <motion.div
                className="cloud-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Flower />
                <span className="handwritten">a little magic, on its way…</span>
              </motion.div>
            </motion.div>
          )}
          {lightbox !== null && photos[lightbox] && (
            <motion.div
              ref={lightboxRef}
              className="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Birthday photo gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
            >
              <button
                ref={closeLightboxRef}
                className="lightbox-close"
                onClick={() => setLightbox(null)}
                aria-label="Close photo"
              >
                <X />
              </button>
              <button
                className="lightbox-prev"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightbox((lightbox - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
              >
                <ChevronLeft />
              </button>
              <figure onClick={(event) => event.stopPropagation()}>
                <Image
                  src={assetPath(photos[lightbox].url)}
                  alt={photos[lightbox].caption}
                  width={1200}
                  height={1000}
                  unoptimized
                />
                <figcaption className="handwritten">
                  {photos[lightbox].caption}
                </figcaption>
              </figure>
              <button
                className="lightbox-next"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightbox((lightbox + 1) % photos.length);
                }}
                aria-label="Next photo"
              >
                <ChevronRight />
              </button>
              <span className="lightbox-count">
                {lightbox + 1} / {photos.length}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
