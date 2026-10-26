// Stand-in for the external Plagiarism Detection Service (CSQ-F-011).
// The mock compares a document with the texts it is given using 3-word
// "shingles" and reports the share of the new document that also appears in
// one existing document (0 = nothing copied, 1 = fully copied).
// Replace scanDocument() with a real API call later; callers do not change.

const SIMILARITY_THRESHOLD = Number(process.env.PLAGIARISM_THRESHOLD || 0.3);
const MAX_ATTEMPTS = 2; // first try + one retry (SRS: retry strategy)

function shingles(text) {
  const words = String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length < 3) return new Set(words.length ? [words.join(" ")] : []);
  const set = new Set();
  for (let i = 0; i <= words.length - 3; i++) {
    set.add(words.slice(i, i + 3).join(" "));
  }
  return set;
}

// corpus: [{ id, text }]  ->  { similarity, matchedMaterialId }
async function mockScan(text, corpus) {
  const mine = shingles(text);
  let best = { similarity: 0, matchedMaterialId: null };
  if (mine.size === 0) return best;
  for (const doc of corpus) {
    const theirs = shingles(doc.text);
    let shared = 0;
    for (const s of mine) if (theirs.has(s)) shared++;
    const similarity = shared / mine.size;
    if (similarity > best.similarity) {
      best = { similarity, matchedMaterialId: doc.id };
    }
  }
  return best;
}

let provider = mockScan;

// Tests use this to simulate an outage of the external service.
function setProvider(fn) {
  provider = fn || mockScan;
}

// Scans with one retry. Never throws:
//   { available: true, similarity, matchedMaterialId, flagged }
//   { available: false }   (service down - caller keeps the item for review)
async function scanDocument(text, corpus = []) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await provider(text, corpus);
      return {
        available: true,
        similarity: result.similarity,
        matchedMaterialId: result.matchedMaterialId,
        flagged: result.similarity >= SIMILARITY_THRESHOLD,
      };
    } catch {
      // try again, then give up
    }
  }
  return { available: false };
}

module.exports = { scanDocument, setProvider, SIMILARITY_THRESHOLD };
