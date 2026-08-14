// firebase.js — верх файла (оставь ровно это один раз)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getRemoteConfig, fetchAndActivate, getValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-remote-config.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB543XIDG4Zw62Oxpey5Pj4O9JzG6gn3Z8",
  authDomain: "click-them-all.firebaseapp.com",
  projectId: "click-them-all",
  storageBucket: "click-them-all.firebasestorage.app",
  messagingSenderId: "409318046859",
  appId: "1:409318046859:web:0d696b7648950fa184e88e"
};

const app = initializeApp(firebaseConfig);

// Временный код для диагностики
console.log("Firebase App initialized:", app);

const auth = getAuth(app);
const db   = getFirestore(app);
const rc   = getRemoteConfig(app);
// В деве тянем конфиг без кеша
rc.settings = { minimumFetchIntervalMillis: 0 };

/** Инициализация: анонимная авторизация + Remote Config */
export async function initBackend() {
  await setPersistence(auth, browserLocalPersistence);
  if (!auth.currentUser) await signInAnonymously(auth);
  await new Promise(res => onAuthStateChanged(auth, () => res()));
  try { await fetchAndActivate(rc); } catch { /* ок, оффлайн */ }
  return auth.currentUser;
}

export function currentUserId() { return auth.currentUser?.uid || null; }

/** Удалённая версия уровня (Firestore: levels/{id}) */
export async function fetchRemoteLevel(levelId) {
  const snap = await getDoc(doc(db, "levels", String(levelId)));
  return snap.exists() ? snap.data() : null;
}

/** Сохранение прогресса по уровню */
export async function saveProgress(levelId, score, won) {
  const uid = currentUserId(); if (!uid) return;
  const ref = doc(db, "progress", uid, "byLevel", String(levelId));
  const prev = await getDoc(ref);
  const best = Math.max(score, prev.exists() ? (prev.data().bestScore || 0) : 0);
  await setDoc(ref, {
    bestScore: best,
    completedAt: won ? new Date() : (prev.exists() ? (prev.data().completedAt || null) : null)
  }, { merge: true });
}

/** Трекинг событий */
export async function trackEvent(name, props = {}) {
  const uid = currentUserId() || "anon";
  await addDoc(collection(db, "events"), { ts: new Date(), userId: uid, name, props });
}

// ======================================================
// LEVEL ATTEMPTS ANALYTICS
// ======================================================

export async function createLevelAttempt(data) {
  await initBackend();

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Firebase user is not authenticated');
  }

  const ref = await addDoc(collection(db, 'levelAttempts'), {
    playerId: user.uid,

    levelId: data.levelId,

    status: 'in_progress',
    exitReason: null,

    targetsCompleted: 0,
    targetsRequired: data.targetsRequired,

    lifeLeft: data.lifeLeft,

    bugTypes: data.bugTypes ?? [],
    spawnWeights: data.spawnWeights ?? {},

    levelParams: data.levelParams ?? {},

    balanceVersion: data.balanceVersion ?? 'unknown',

    startedAt: serverTimestamp(),
    finishedAt: null,

    durationMs: null
  });

  return ref.id;
}

export async function finishLevelAttempt(attemptId, result) {
  if (!attemptId) return;

  await initBackend();

  const ref = doc(db, 'levelAttempts', attemptId);
  await updateDoc(ref, {
    status: result.status,

    exitReason: result.exitReason ?? null,

    targetsCompleted: result.targetsCompleted,
    targetsRequired: result.targetsRequired,

    lifeLeft: result.lifeLeft,

    durationMs: result.durationMs,

    finishedAt: serverTimestamp()
  });
}

/** Пересчёт суммарного результата для лидерборда (на клиенте, простая версия) */
export async function recalcLeaderboard(totalLevels) {
  const uid = currentUserId(); if (!uid) return;
  let total = 0;
  const snaps = await getDocs(collection(db, "progress", uid, "byLevel"));
  snaps.forEach(s => total += s.data().bestScore || 0);
  await setDoc(doc(db, "leaderboards", "current", uid), { total, updatedAt: new Date() }, { merge: true });
}

/** Чтение числового параметра из Remote Config */
export function rcNumber(key, fallback = null) {
  try {
    const v = getValue(rc, key).asNumber();
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}


/** Чтение сырых попыток уровней для внутреннего дашборда */
export async function getLevelAttempts() {
  await initBackend();

  const snaps = await getDocs(
    collection(db, "levelAttempts")
  );

  return snaps.docs.map(s => ({
    id: s.id,
    ...s.data()
  }));
}